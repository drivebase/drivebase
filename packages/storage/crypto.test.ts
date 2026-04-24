import { describe, expect, test } from "bun:test";
import {
  encryptString,
  decryptString,
  encryptJson,
  decryptJson,
} from "./crypto.ts";
import { CryptoError } from "./errors.ts";

const key = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString(
  "base64",
);
const otherKey = Buffer.from(
  crypto.getRandomValues(new Uint8Array(32)),
).toString("base64");

describe("crypto", () => {
  test("roundtrip string", async () => {
    const plaintext = "hello — Ω world";
    const blob = await encryptString(key, plaintext);
    expect(blob.iv).toBeString();
    expect(blob.tag).toBeString();
    expect(blob.ct).toBeString();
    expect(await decryptString(key, blob)).toBe(plaintext);
  });

  test("roundtrip json", async () => {
    const value = { accessToken: "AKIA...", refreshToken: "r", n: 7 };
    const blob = await encryptJson(key, value);
    const out = await decryptJson<typeof value>(key, blob);
    expect(out).toEqual(value);
  });

  test("different keys fail to decrypt", async () => {
    const blob = await encryptString(key, "secret");
    await expect(decryptString(otherKey, blob)).rejects.toBeInstanceOf(
      CryptoError,
    );
  });

  test("short master key rejected", async () => {
    const bad = Buffer.alloc(16).toString("base64");
    await expect(encryptString(bad, "x")).rejects.toBeInstanceOf(CryptoError);
  });
});
