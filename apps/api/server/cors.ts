import { env } from "../config/env";

export function getProxyCorsHeaders() {
	return {
		"Access-Control-Allow-Origin": env.CORS_ORIGIN,
		"Access-Control-Allow-Credentials": "true",
	};
}
