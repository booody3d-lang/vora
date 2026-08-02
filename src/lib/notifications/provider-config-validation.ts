import "server-only";

import {
  getEmailProviderLabel,
  isEmailConsoleMode,
  readEmailTransportMode,
  resolveActiveEmailProvider,
} from "@/lib/email/email-provider";
import {
  getOtpProviderLabel,
  isOtpConsoleMode,
  readOtpProviderMode,
  resolveActiveOtpProviderId,
} from "@/lib/auth/otp-provider";
import {
  isResendConfigured,
  resolveResendFromEmail,
} from "@/lib/email/config";
import { isStrictProduction } from "@/lib/env/validate";
import type { EmailProviderId } from "@/lib/email/types";

export interface ProviderReadinessCheck {
  ready: boolean;
  reasons: string[];
}

export interface NotificationProviderConfigValidation {
  environment: {
    nodeEnv: string;
    strictProduction: boolean;
  };
  otp: {
    activeProvider: ReturnType<typeof resolveActiveOtpProviderId>;
    forcedMode: ReturnType<typeof readOtpProviderMode>;
    consoleMode: boolean;
    providerLabel: string;
    twilio: {
      configured: boolean;
      missingFields: string[];
      keyPresence: {
        accountSid: boolean;
        authToken: boolean;
        smsFrom: boolean;
        whatsappFrom: boolean;
      };
    };
    readiness: {
      sms: ProviderReadinessCheck;
      whatsapp: ProviderReadinessCheck;
    };
  };
  email: {
    activeProvider: EmailProviderId;
    forcedMode: ReturnType<typeof readEmailTransportMode>;
    consoleMode: boolean;
    providerLabel: string;
    resend: {
      configured: boolean;
      missingFields: string[];
      fromEmail: string;
      keyPresence: {
        apiKey: boolean;
        fromEmail: boolean;
      };
    };
    readiness: {
      transactional: ProviderReadinessCheck;
      notifications: ProviderReadinessCheck;
    };
  };
  routes: {
    otpSend: string;
    notificationEmail: string;
  };
  warnings: string[];
}

function envPresent(key: string): boolean {
  return Boolean(process.env[key]?.trim());
}

function collectTwilioMissingFields(keyPresence: {
  accountSid: boolean;
  authToken: boolean;
  smsFrom: boolean;
  whatsappFrom: boolean;
}): string[] {
  const missing: string[] = [];
  if (!keyPresence.accountSid) missing.push("TWILIO_ACCOUNT_SID");
  if (!keyPresence.authToken) missing.push("TWILIO_AUTH_TOKEN");
  if (!keyPresence.smsFrom) missing.push("TWILIO_SMS_FROM");
  if (!keyPresence.whatsappFrom) missing.push("TWILIO_WHATSAPP_FROM");
  return missing;
}

function collectResendMissingFields(keyPresence: {
  apiKey: boolean;
  fromEmail: boolean;
}): string[] {
  const missing: string[] = [];
  if (!keyPresence.apiKey) missing.push("RESEND_API_KEY");
  if (!keyPresence.fromEmail) missing.push("RESEND_FROM_EMAIL");
  return missing;
}

function assessOtpChannelReadiness(
  channel: "sms" | "whatsapp",
  activeProvider: ReturnType<typeof resolveActiveOtpProviderId>,
  twilioConfigured: boolean,
  keyPresence: NotificationProviderConfigValidation["otp"]["twilio"]["keyPresence"],
  strictProduction: boolean
): ProviderReadinessCheck {
  const reasons: string[] = [];

  if (activeProvider === "console") {
    if (strictProduction) {
      reasons.push("Console OTP fallback is disabled in production");
    }
    return { ready: reasons.length === 0, reasons };
  }

  if (activeProvider === "resend") {
    return { ready: true, reasons: [] };
  }

  if (!twilioConfigured) {
    reasons.push("Twilio credentials are incomplete");
    return { ready: false, reasons };
  }

  if (channel === "sms" && !keyPresence.smsFrom) {
    reasons.push("TWILIO_SMS_FROM is required for SMS OTP delivery");
  }
  if (channel === "whatsapp" && !keyPresence.whatsappFrom) {
    reasons.push("TWILIO_WHATSAPP_FROM is required for WhatsApp OTP delivery");
  }

  return { ready: reasons.length === 0, reasons };
}

function assessEmailReadiness(
  activeProvider: EmailProviderId,
  resendConfigured: boolean,
  strictProduction: boolean
): ProviderReadinessCheck {
  const reasons: string[] = [];

  if (activeProvider === "console") {
    if (strictProduction) {
      reasons.push("Console email fallback is disabled in production");
    }
    return { ready: reasons.length === 0, reasons };
  }

  if (!resendConfigured) {
    reasons.push("Resend API key is required for email delivery");
  }

  return { ready: reasons.length === 0, reasons };
}

/** Server-only OTP/email provider validation for diagnostics and production guards. */
export function validateNotificationProviderConfig(): NotificationProviderConfigValidation {
  const strictProduction = isStrictProduction();
  const forcedOtpMode = readOtpProviderMode();
  const forcedEmailMode = readEmailTransportMode();
  const activeOtpProvider = resolveActiveOtpProviderId();
  const activeEmailProvider = resolveActiveEmailProvider();

  const twilioKeyPresence = {
    accountSid: envPresent("TWILIO_ACCOUNT_SID"),
    authToken: envPresent("TWILIO_AUTH_TOKEN"),
    smsFrom: envPresent("TWILIO_SMS_FROM"),
    whatsappFrom: envPresent("TWILIO_WHATSAPP_FROM"),
  };

  const twilioCoreConfigured = twilioKeyPresence.accountSid && twilioKeyPresence.authToken;
  const twilioConfigured =
    twilioCoreConfigured && twilioKeyPresence.smsFrom && twilioKeyPresence.whatsappFrom;

  const resendKeyPresence = {
    apiKey: isResendConfigured(),
    fromEmail: Boolean(resolveResendFromEmail()?.trim()),
  };
  const resendConfigured = resendKeyPresence.apiKey;

  const twilioMissingFields = collectTwilioMissingFields(twilioKeyPresence);
  const resendMissingFields = collectResendMissingFields(resendKeyPresence);

  const warnings: string[] = [];

  if (forcedOtpMode === "twilio" && !twilioCoreConfigured) {
    warnings.push(
      "OTP_PROVIDER=twilio but Twilio credentials are incomplete; OTP delivery falls back to console in non-production"
    );
  }

  if (forcedOtpMode === "resend" && !resendConfigured) {
    warnings.push(
      "OTP_PROVIDER=resend but RESEND_API_KEY is missing; phone OTP routes are unavailable — configure Resend for email verification"
    );
  }

  if (forcedEmailMode === "resend" && !resendConfigured) {
    warnings.push(
      "EMAIL_TRANSPORT_MODE=resend but RESEND_API_KEY is missing; email falls back to console in non-production"
    );
  }

  if (strictProduction && isOtpConsoleMode()) {
    warnings.push("Production is running with console OTP fallback — configure Twilio or set OTP_PROVIDER=resend before launch");
  }

  if (strictProduction && isEmailConsoleMode()) {
    warnings.push("Production is running with console email fallback — configure Resend before launch");
  }

  const otpSms = assessOtpChannelReadiness(
    "sms",
    activeOtpProvider,
    twilioCoreConfigured,
    twilioKeyPresence,
    strictProduction
  );
  const otpWhatsapp = assessOtpChannelReadiness(
    "whatsapp",
    activeOtpProvider,
    twilioCoreConfigured,
    twilioKeyPresence,
    strictProduction
  );
  const emailTransactional = assessEmailReadiness(activeEmailProvider, resendConfigured, strictProduction);
  const emailNotifications = assessEmailReadiness(activeEmailProvider, resendConfigured, strictProduction);

  return {
    environment: {
      nodeEnv: process.env.NODE_ENV ?? "unknown",
      strictProduction,
    },
    otp: {
      activeProvider: activeOtpProvider,
      forcedMode: forcedOtpMode,
      consoleMode: isOtpConsoleMode(),
      providerLabel: getOtpProviderLabel(activeOtpProvider),
      twilio: {
        configured: twilioConfigured,
        missingFields: twilioMissingFields,
        keyPresence: twilioKeyPresence,
      },
      readiness: {
        sms: otpSms,
        whatsapp: otpWhatsapp,
      },
    },
    email: {
      activeProvider: activeEmailProvider,
      forcedMode: forcedEmailMode,
      consoleMode: isEmailConsoleMode(),
      providerLabel: getEmailProviderLabel(activeEmailProvider),
      resend: {
        configured: resendConfigured,
        missingFields: resendMissingFields,
        fromEmail: resolveResendFromEmail(),
        keyPresence: resendKeyPresence,
      },
      readiness: {
        transactional: emailTransactional,
        notifications: emailNotifications,
      },
    },
    routes: {
      otpSend: "/api/auth/otp/send",
      notificationEmail: "/api/notifications/email",
    },
    warnings,
  };
}

export function collectOtpReadinessReasons(
  channel: "sms" | "whatsapp" = "sms"
): string[] {
  const config = validateNotificationProviderConfig();
  return config.otp.readiness[channel].reasons;
}

export function collectEmailReadinessReasons(): string[] {
  const config = validateNotificationProviderConfig();
  return config.email.readiness.transactional.reasons;
}