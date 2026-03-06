import { AuthenticationError } from "@drivebase/core";
import { jwtVerify, SignJWT } from "jose";
import { env } from "../../config/env";

const SECRET = new TextEncoder().encode(env.JWT_SECRET);
const ISSUER = "drivebase";
const AUDIENCE = "drivebase-api";

export interface JWTPayload {
	userId: string;
	email: string;
	role: string;
}

export async function createToken(
	payload: JWTPayload,
	expiresIn: string = "7d",
): Promise<string> {
	const jwt = await new SignJWT({ ...payload })
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setIssuer(ISSUER)
		.setAudience(AUDIENCE)
		.setExpirationTime(expiresIn)
		.sign(SECRET);

	return jwt;
}

export async function verifyToken(token: string): Promise<JWTPayload> {
	try {
		const { payload } = await jwtVerify(token, SECRET, {
			issuer: ISSUER,
			audience: AUDIENCE,
		});

		if (
			typeof payload.userId !== "string" ||
			typeof payload.email !== "string" ||
			typeof payload.role !== "string"
		) {
			throw new Error("Invalid token payload structure");
		}

		return payload as unknown as JWTPayload;
	} catch (error) {
		throw new AuthenticationError("Invalid or expired token", {
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

export function extractToken(
	authHeader?: string | null,
	cookie?: string | null,
): string | null {
	if (authHeader?.startsWith("Bearer ")) {
		return authHeader.slice(7);
	}

	if (cookie) {
		const match = cookie.match(/token=([^;]+)/);
		if (match?.[1]) {
			return match[1];
		}
	}

	return null;
}
