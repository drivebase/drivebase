import { getRedis } from "./client";

const OTP_PREFIX = "otp:";
const OTP_TTL = 10 * 60; // 10 minutes in seconds

/**
 * Store OTP for email
 */
export async function storeOTP(email: string, otp: string): Promise<void> {
  const redis = getRedis();
  const key = `${OTP_PREFIX}${email}`;

  await redis.setex(key, OTP_TTL, otp);
}

/**
 * Verify and consume OTP
 * Returns true if OTP is valid, false otherwise
 */
export async function verifyOTP(email: string, otp: string): Promise<boolean> {
  const redis = getRedis();
  const key = `${OTP_PREFIX}${email}`;

  const storedOTP = await redis.get(key);

  if (!storedOTP || storedOTP !== otp) {
    return false;
  }

  // Delete OTP after verification (one-time use)
  await redis.del(key);

  return true;
}

/**
 * Check if OTP exists for email
 */
export async function hasOTP(email: string): Promise<boolean> {
  const redis = getRedis();
  const key = `${OTP_PREFIX}${email}`;

  const exists = await redis.exists(key);

  return exists === 1;
}
