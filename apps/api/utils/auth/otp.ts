import { env } from "../../config/env";
import { logger } from "../runtime/logger";

export function generateOTP(): string {
	return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOTP(email: string, otp: string): Promise<void> {
	if (env.NODE_ENV === "development") {
		logger.info({ msg: "OTP Generated", email, otp });
	} else {
		logger.warn({
			msg: "Email service not implemented. OTP generated but not sent.",
			email,
		});
	}
}
