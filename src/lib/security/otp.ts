import { TOTP, Secret } from "otpauth";
import { hashPassword } from "@/lib/security/password";

const SAUDI_PHONE_REGEX = /^(\+966|966|0)?5[0-9]{8}$/;

export function normalizeSaudiPhone(input: string): string | null {
  const cleaned = input.replace(/[\s\-()]/g, "");
  if (!SAUDI_PHONE_REGEX.test(cleaned)) return null;
  const digits = cleaned.replace(/^\+966|^966|^0/, "");
  return `+966${digits}`;
}

export function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function hashOtp(code: string): Promise<string> {
  return hashPassword(`otp:${code}`);
}

export async function verifyOtp(code: string, hash: string): Promise<boolean> {
  const computed = await hashOtp(code);
  return computed === hash;
}

export function generateTotpSecret(email: string): { secret: string; uri: string } {
  const secret = new Secret({ size: 20 });
  const totp = new TOTP({
    issuer: "VORA",
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret,
  });
  return { secret: secret.base32, uri: totp.toString() };
}

export function verifyTotpCode(secret: string, code: string): boolean {
  const totp = new TOTP({ secret: Secret.fromBase32(secret), algorithm: "SHA1", digits: 6, period: 30 });
  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
}
