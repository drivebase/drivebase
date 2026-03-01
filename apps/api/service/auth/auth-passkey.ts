import {
	AuthenticationError,
	NotFoundError,
	ValidationError,
} from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { passkeys, users } from "@drivebase/db";
import type {
	AuthenticationResponseJSON,
	AuthenticatorTransportFuture,
	RegistrationResponseJSON,
} from "@simplewebauthn/server";
import {
	generateAuthenticationOptions,
	generateRegistrationOptions,
	verifyAuthenticationResponse,
	verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { isoBase64URL, isoUint8Array } from "@simplewebauthn/server/helpers";
import { and, eq } from "drizzle-orm";
import { env } from "../../config/env";
import {
	consumeAuthChallenge,
	consumeRegistrationChallenge,
	storeAuthChallenge,
	storeRegistrationChallenge,
} from "../../redis/passkey-challenge";
import { createSession } from "../../redis/session";
import { createToken } from "../../utils/jwt";

function getRpConfig() {
	const url = new URL(env.CORS_ORIGIN);
	return {
		rpID: url.hostname,
		rpName: "Drivebase",
		rpOrigin: env.CORS_ORIGIN,
	};
}

/**
 * Generate passkey registration options for an authenticated user
 */
export async function startPasskeyRegistration(db: Database, userId: string) {
	const [user] = await db
		.select()
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);

	if (!user) throw new NotFoundError("User not found");

	const existingPasskeys = await db
		.select()
		.from(passkeys)
		.where(eq(passkeys.userId, userId));

	const { rpID, rpName } = getRpConfig();

	const options = await generateRegistrationOptions({
		rpName,
		rpID,
		userName: user.email,
		userID: isoUint8Array.fromUTF8String(userId),
		attestationType: "none",
		excludeCredentials: existingPasskeys.map((pk) => ({
			id: pk.credentialId,
			transports: (pk.transports ?? []) as AuthenticatorTransportFuture[],
		})),
		authenticatorSelection: {
			residentKey: "preferred",
			userVerification: "preferred",
		},
	});

	await storeRegistrationChallenge(userId, options.challenge);

	return JSON.stringify(options);
}

/**
 * Verify passkey registration response and store credential
 */
export async function verifyPasskeyRegistration(
	db: Database,
	userId: string,
	name: string,
	responseJson: string,
) {
	const challenge = await consumeRegistrationChallenge(userId);
	if (!challenge) throw new ValidationError("Registration challenge expired");

	const { rpID, rpOrigin } = getRpConfig();

	const response = JSON.parse(responseJson) as RegistrationResponseJSON;

	const verification = await verifyRegistrationResponse({
		response,
		expectedChallenge: challenge,
		expectedOrigin: rpOrigin,
		expectedRPID: rpID,
	});

	if (!verification.verified || !verification.registrationInfo) {
		throw new ValidationError("Passkey verification failed");
	}

	const { credential, credentialDeviceType, credentialBackedUp } =
		verification.registrationInfo;

	const [passkey] = await db
		.insert(passkeys)
		.values({
			userId,
			name,
			credentialId: credential.id,
			publicKey: isoBase64URL.fromBuffer(credential.publicKey),
			counter: credential.counter,
			deviceType: credentialDeviceType,
			backedUp: credentialBackedUp,
			transports: credential.transports ?? [],
		})
		.returning();

	if (!passkey) throw new Error("Failed to store passkey");

	return passkey;
}

/**
 * Generate passkey authentication options (no email required — discoverable credentials)
 */
export async function startPasskeyLogin(_db: Database) {
	const { rpID } = getRpConfig();

	const options = await generateAuthenticationOptions({
		rpID,
		userVerification: "preferred",
		// No allowCredentials — lets the OS show all passkeys for this RP
	});

	const challengeId = crypto.randomUUID();
	await storeAuthChallenge(challengeId, options.challenge);

	return JSON.stringify({ optionsJson: JSON.stringify(options), challengeId });
}

/**
 * Verify authentication response and return session token
 */
export async function verifyPasskeyLogin(
	db: Database,
	challengeId: string,
	responseJson: string,
) {
	const challenge = await consumeAuthChallenge(challengeId);
	if (!challenge) throw new ValidationError("Authentication challenge expired");

	const response = JSON.parse(responseJson) as AuthenticationResponseJSON;

	// Look up the passkey by credential ID — no email needed
	const [passkey] = await db
		.select()
		.from(passkeys)
		.where(eq(passkeys.credentialId, response.id))
		.limit(1);

	if (!passkey) throw new AuthenticationError("Passkey not recognised");

	const [user] = await db
		.select()
		.from(users)
		.where(eq(users.id, passkey.userId))
		.limit(1);

	if (!user) throw new AuthenticationError("User not found");
	if (!user.isActive) throw new AuthenticationError("Account is disabled");

	const { rpID, rpOrigin } = getRpConfig();

	const verification = await verifyAuthenticationResponse({
		response,
		expectedChallenge: challenge,
		expectedOrigin: rpOrigin,
		expectedRPID: rpID,
		credential: {
			id: passkey.credentialId,
			publicKey: isoBase64URL.toBuffer(passkey.publicKey),
			counter: passkey.counter,
			transports: (passkey.transports ?? []) as AuthenticatorTransportFuture[],
		},
	});

	if (!verification.verified) {
		throw new AuthenticationError("Passkey authentication failed");
	}

	await db
		.update(passkeys)
		.set({
			counter: verification.authenticationInfo.newCounter,
			lastUsedAt: new Date(),
		})
		.where(eq(passkeys.id, passkey.id));

	await db
		.update(users)
		.set({ lastLoginAt: new Date() })
		.where(eq(users.id, user.id));

	const token = await createToken({
		userId: user.id,
		email: user.email,
		role: user.role,
	});

	await createSession(token, {
		userId: user.id,
		email: user.email,
		role: user.role,
		createdAt: Date.now(),
	});

	return { user, token };
}

/**
 * List passkeys for a user
 */
export async function getPasskeys(db: Database, userId: string) {
	return db.select().from(passkeys).where(eq(passkeys.userId, userId));
}

/**
 * Delete a passkey
 */
export async function deletePasskey(
	db: Database,
	userId: string,
	passkeyId: string,
) {
	const [existing] = await db
		.select()
		.from(passkeys)
		.where(and(eq(passkeys.id, passkeyId), eq(passkeys.userId, userId)))
		.limit(1);

	if (!existing) throw new NotFoundError("Passkey not found");

	await db.delete(passkeys).where(eq(passkeys.id, passkeyId));
}
