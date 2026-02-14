import * as telegramAuth from "../../services/telegram-auth";
import { verifyToken } from "../../utils/jwt";
import { logger } from "../../utils/logger";
import { getProxyCorsHeaders } from "../cors";

/**
 * Authenticate a request via Bearer token.
 * Returns { userId } on success or a Response on failure.
 */
export async function authenticateRequest(
	request: Request,
): Promise<{ userId: string } | Response> {
	const corsHeaders = getProxyCorsHeaders();
	const authHeader = request.headers.get("Authorization");
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return new Response("Unauthorized", { status: 401, headers: corsHeaders });
	}
	const token = authHeader.split(" ")[1];
	if (!token) {
		return new Response("Unauthorized", { status: 401, headers: corsHeaders });
	}
	try {
		const payload = await verifyToken(token);
		return { userId: payload.userId };
	} catch (_error) {
		return new Response("Invalid token", { status: 401, headers: corsHeaders });
	}
}

/**
 * POST /api/telegram/send-code
 * Body: { providerId, apiId, apiHash, phone }
 */
export async function handleTelegramSendCode(
	request: Request,
): Promise<Response> {
	const corsHeaders = getProxyCorsHeaders();
	const auth = await authenticateRequest(request);
	if (auth instanceof Response) return auth;

	try {
		const body = (await request.json()) as Record<string, unknown>;
		const providerId = body.providerId as string | undefined;
		const apiId = Number(body.apiId);
		const apiHash = body.apiHash as string | undefined;
		const phone = body.phone as string | undefined;

		if (!providerId || !apiId || !apiHash || !phone) {
			return new Response(
				JSON.stringify({ error: "Missing required fields" }),
				{
					status: 400,
					headers: { "Content-Type": "application/json", ...corsHeaders },
				},
			);
		}

		const result = await telegramAuth.sendCode(
			providerId,
			apiId,
			apiHash,
			phone,
		);
		return new Response(JSON.stringify(result), {
			headers: { "Content-Type": "application/json", ...corsHeaders },
		});
	} catch (error) {
		logger.error({ msg: "Telegram send-code failed", error });
		const message = error instanceof Error ? error.message : String(error);
		return new Response(JSON.stringify({ error: message }), {
			status: 500,
			headers: { "Content-Type": "application/json", ...corsHeaders },
		});
	}
}

/**
 * POST /api/telegram/verify
 * Body: { providerId, code }
 */
export async function handleTelegramVerify(
	request: Request,
): Promise<Response> {
	const corsHeaders = getProxyCorsHeaders();
	const auth = await authenticateRequest(request);
	if (auth instanceof Response) return auth;

	try {
		const body = (await request.json()) as Record<string, unknown>;
		const providerId = body.providerId as string | undefined;
		const code = body.code as string | undefined;

		if (!providerId || !code) {
			return new Response(
				JSON.stringify({ error: "Missing required fields" }),
				{
					status: 400,
					headers: { "Content-Type": "application/json", ...corsHeaders },
				},
			);
		}

		const result = await telegramAuth.verifyCode(providerId, code);
		return new Response(JSON.stringify(result), {
			headers: { "Content-Type": "application/json", ...corsHeaders },
		});
	} catch (error) {
		logger.error({ msg: "Telegram verify failed", error });
		const message = error instanceof Error ? error.message : String(error);
		return new Response(JSON.stringify({ error: message }), {
			status: 500,
			headers: { "Content-Type": "application/json", ...corsHeaders },
		});
	}
}

/**
 * POST /api/telegram/verify-2fa
 * Body: { providerId, password }
 */
export async function handleTelegramVerify2FA(
	request: Request,
): Promise<Response> {
	const corsHeaders = getProxyCorsHeaders();
	const auth = await authenticateRequest(request);
	if (auth instanceof Response) return auth;

	try {
		const body = (await request.json()) as Record<string, unknown>;
		const providerId = body.providerId as string | undefined;
		const password = body.password as string | undefined;

		if (!providerId || !password) {
			return new Response(
				JSON.stringify({ error: "Missing required fields" }),
				{
					status: 400,
					headers: { "Content-Type": "application/json", ...corsHeaders },
				},
			);
		}

		const result = await telegramAuth.verify2FA(providerId, password);
		return new Response(JSON.stringify(result), {
			headers: { "Content-Type": "application/json", ...corsHeaders },
		});
	} catch (error) {
		logger.error({ msg: "Telegram verify-2fa failed", error });
		const message = error instanceof Error ? error.message : String(error);
		return new Response(JSON.stringify({ error: message }), {
			status: 500,
			headers: { "Content-Type": "application/json", ...corsHeaders },
		});
	}
}
