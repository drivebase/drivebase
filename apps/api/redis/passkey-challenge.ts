import { getRedis } from "./client";

const CHALLENGE_TTL = 5 * 60; // 5 minutes
const REG_PREFIX = "passkey:reg-challenge:";
const AUTH_PREFIX = "passkey:auth-challenge:";

export async function storeRegistrationChallenge(
	userId: string,
	challenge: string,
): Promise<void> {
	await getRedis().setex(`${REG_PREFIX}${userId}`, CHALLENGE_TTL, challenge);
}

export async function consumeRegistrationChallenge(
	userId: string,
): Promise<string | null> {
	const redis = getRedis();
	const key = `${REG_PREFIX}${userId}`;
	const challenge = await redis.get(key);
	if (challenge) await redis.del(key);
	return challenge;
}

export async function storeAuthChallenge(
	challengeId: string,
	challenge: string,
): Promise<void> {
	await getRedis().setex(
		`${AUTH_PREFIX}${challengeId}`,
		CHALLENGE_TTL,
		challenge,
	);
}

export async function consumeAuthChallenge(
	challengeId: string,
): Promise<string | null> {
	const redis = getRedis();
	const key = `${AUTH_PREFIX}${challengeId}`;
	const challenge = await redis.get(key);
	if (challenge) await redis.del(key);
	return challenge;
}
