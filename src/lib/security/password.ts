export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  if (password.length < 8) errors.push("Minimum 8 characters required");
  if (!/[0-9]/.test(password)) errors.push("Must contain at least one number");
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password))
    errors.push("Must contain at least one special symbol");
  return { valid: errors.length === 0, errors };
}

export async function hashPassword(password: string): Promise<string> {
  const pepper = process.env.PASSWORD_PEPPER;
  if (!pepper && process.env.NODE_ENV === "production") {
    throw new Error("Missing PASSWORD_PEPPER");
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(password + (pepper ?? "vora-pepper-2026"));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password);
  return computed === hash;
}
