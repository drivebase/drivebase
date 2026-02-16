import { Hono } from "hono";
import * as telegramAuth from "./auth";

/**
 * Create Telegram authentication routes Hono sub-app
 * These routes are mounted at /api/telegram and require authentication
 */
export function createTelegramRoutes(): Hono {
	const app = new Hono();

	/**
	 * POST /send-code
	 * Body: { providerId, apiId, apiHash, phone }
	 */
	app.post("/send-code", async (c) => {
		try {
			const body = (await c.req.json()) as Record<string, unknown>;
			const providerId = body.providerId as string | undefined;
			const apiId = Number(body.apiId);
			const apiHash = body.apiHash as string | undefined;
			const phone = body.phone as string | undefined;

			if (!providerId || !apiId || !apiHash || !phone) {
				return c.json({ error: "Missing required fields" }, 400);
			}

			const result = await telegramAuth.sendCode(
				providerId,
				apiId,
				apiHash,
				phone,
			);
			return c.json(result);
		} catch (error) {
			console.error("Telegram send-code failed:", error);
			const message = error instanceof Error ? error.message : String(error);
			return c.json({ error: message }, 500);
		}
	});

	/**
	 * POST /verify
	 * Body: { providerId, code }
	 */
	app.post("/verify", async (c) => {
		try {
			const body = (await c.req.json()) as Record<string, unknown>;
			const providerId = body.providerId as string | undefined;
			const code = body.code as string | undefined;

			if (!providerId || !code) {
				return c.json({ error: "Missing required fields" }, 400);
			}

			const result = await telegramAuth.verifyCode(providerId, code);
			return c.json(result);
		} catch (error) {
			console.error("Telegram verify failed:", error);
			const message = error instanceof Error ? error.message : String(error);
			return c.json({ error: message }, 500);
		}
	});

	/**
	 * POST /verify-2fa
	 * Body: { providerId, password }
	 */
	app.post("/verify-2fa", async (c) => {
		try {
			const body = (await c.req.json()) as Record<string, unknown>;
			const providerId = body.providerId as string | undefined;
			const password = body.password as string | undefined;

			if (!providerId || !password) {
				return c.json({ error: "Missing required fields" }, 400);
			}

			const result = await telegramAuth.verify2FA(providerId, password);
			return c.json(result);
		} catch (error) {
			console.error("Telegram verify-2fa failed:", error);
			const message = error instanceof Error ? error.message : String(error);
			return c.json({ error: message }, 500);
		}
	});

	return app;
}
