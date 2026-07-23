import "server-only";

export class NotificationProviderNotReadyError extends Error {
  readonly channel: "otp" | "email";
  readonly reasons: string[];

  constructor(channel: "otp" | "email", reasons: string[]) {
    const label = channel === "otp" ? "OTP" : "Email";
    super(
      reasons.length > 0
        ? `${label} delivery is unavailable: ${reasons.join("; ")}`
        : `${label} delivery is unavailable in production`
    );
    this.name = "NotificationProviderNotReadyError";
    this.channel = channel;
    this.reasons = reasons;
  }
}
