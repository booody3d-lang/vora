import { NextResponse } from "next/server";
import {
  changeSupabasePassword,
  requestSupabasePasswordReset,
  resetSupabasePasswordWithSession,
} from "@/lib/auth/supabase-password";
import { assertOtpProviderReady, getConfiguredOtpProvider } from "@/lib/auth/otp-provider";
import { changeAccountPassword, resetAccountPassword } from "@/lib/security/account-password";
import {
  createPasswordResetRequest,
  getPasswordResetRequest,
  getRecoveryChannel,
  markPasswordResetUsed,
  setRecoveryChannel,
  type RecoveryChannel,
} from "@/lib/security/auth-store";
import { findAccountByEmail, findAccountByPhone } from "@/lib/security/demo-store";
import { generateOtpCode, hashOtp, normalizeSaudiPhone, verifyOtp } from "@/lib/security/otp";
import { buildTriggerNotification } from "@/lib/notifications/triggers";
import { serverDispatchNotification } from "@/lib/notifications/server-dispatch";
import {
  getGenderForAccount,
  getProfileSlugForAccount,
  getStoreSlugForAccount,
} from "@/lib/profile/profile-store";
import { resolveAvatarUrl } from "@/lib/profile/avatar";
import { getOnboardingProgress, isOnboardingComplete } from "@/lib/profile/onboarding";
import { getEffectiveSubscription } from "@/lib/subscription/resolve-subscription";
import { ensureSubscriptionCacheHydrated } from "@/lib/subscription/subscription-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import { getRequestAuditContext, writeSecurityAuditEvent } from "@/lib/security/audit-store";
import { NotificationProviderNotReadyError } from "@/lib/notifications/provider-errors";
import { resolveAdminCapabilities } from "@/lib/security/roles";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { stripPrivateProfileFields } from "@/lib/profile/private-fields";
import { getSocialProfileContext } from "@/lib/network/social-store";
import {
  ensureSupabaseProfileAndStore,
  loadProfileForAccount,
  loadStoreForAccount,
} from "@/lib/supabase/profile-persistence";

const PASSWORD_SECURITY = {
  changePassword: {
    method: "PATCH" as const,
    url: "/api/profile/me",
    action: "changePassword",
    fields: ["currentPassword", "newPassword"],
  },
  forgotPassword: {
    method: "POST" as const,
    url: "/api/auth/password/forgot",
    fields: ["emailOrPhone", "channel"],
  },
  resetPassword: {
    method: "POST" as const,
    url: "/api/auth/password/reset",
    fields: ["token", "code", "newPassword"],
  },
  setRecoveryChannel: {
    method: "PATCH" as const,
    url: "/api/profile/me",
    action: "setRecoveryChannel",
    fields: ["channel"],
  },
};

export async function GET() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ authenticated: false });
  }

  await ensureSupabaseProfileAndStore(auth.user);
  await ensureSubscriptionCacheHydrated();

  const profile = await loadProfileForAccount(auth.user.id);
  const store = await loadStoreForAccount(auth.user.id);
  const profileSlug = profile?.slug ?? getProfileSlugForAccount(auth.user.id);
  const storeSlug = store?.slug ?? getStoreSlugForAccount(auth.user.id);
  const gender = profile?.gender ?? getGenderForAccount(auth.user.id);
  const onboardingComplete = profile ? isOnboardingComplete(profile) : false;
  const onboardingProgress = profile ? getOnboardingProgress(profile) : null;
  const subscription = getEffectiveSubscription(auth.user.id, "user");
  const recoveryChannel = getRecoveryChannel(auth.user.id);
  const social = await getSocialProfileContext(auth.user.id, auth.user.id);

  return NextResponse.json({
    authenticated: true,
    profileSlug,
    storeSlug,
    gender,
    onboardingComplete,
    onboardingProgress,
    avatarUrl: resolveAvatarUrl({
      photoUrl: profile?.profilePhotoUrl,
      gender,
    }),
    profile: profile
      ? {
          ...stripPrivateProfileFields(profile),
          isPremium: subscription.isPremium,
          privateMobileNumber: profile.privateMobileNumber,
          backupEmail: profile.backupEmail,
        }
      : null,
    store,
    subscription,
    circle: {
      endpoint: "/api/social/circle",
      followerCount: social.followerCount,
      followingCount: social.followingCount,
    },
    privateContact: {
      privateMobileNumber: profile?.privateMobileNumber ?? "",
      backupEmail: profile?.backupEmail ?? "",
      updateVia: "PATCH /api/profile",
      fields: ["privateMobileNumber", "backupEmail"],
    },
    security: {
      password: PASSWORD_SECURITY,
      recoveryChannel,
      capabilities: resolveAdminCapabilities(auth.user),
    },
  });
}

export async function PATCH(request: Request) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      action?: string;
      currentPassword?: string;
      newPassword?: string;
      channel?: RecoveryChannel;
      emailOrPhone?: string;
      token?: string;
      code?: string;
    };

    switch (body.action) {
      case "changePassword": {
        if (!body.currentPassword || !body.newPassword) {
          return NextResponse.json(
            { error: "currentPassword and newPassword are required" },
            { status: 400 }
          );
        }
        if (isSupabaseConfigured()) {
          const result = await changeSupabasePassword(
            auth.user.email,
            body.currentPassword,
            body.newPassword
          );
          if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: 400 });
          }
          const { ip, userAgent } = getRequestAuditContext(request);
          await writeSecurityAuditEvent({
            accountId: auth.user.id,
            action: "security.password.changed",
            ip,
            userAgent,
          });
          return NextResponse.json({ ok: true, action: "changePassword" });
        }
        const result = await changeAccountPassword(
          auth.user.id,
          body.currentPassword,
          body.newPassword
        );
        if (!result.ok) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        const { ip, userAgent } = getRequestAuditContext(request);
        await writeSecurityAuditEvent({
          accountId: auth.user.id,
          action: "security.password.changed",
          ip,
          userAgent,
        });
        return NextResponse.json({ ok: true, action: "changePassword" });
      }

      case "setRecoveryChannel": {
        if (body.channel !== "email" && body.channel !== "sms") {
          return NextResponse.json({ error: "channel must be email or sms" }, { status: 400 });
        }
        setRecoveryChannel(auth.user.id, body.channel);
        return NextResponse.json({ ok: true, recoveryChannel: body.channel });
      }

      case "forgotPassword": {
        const identifier = body.emailOrPhone?.trim() ?? auth.user.email;
        if (isSupabaseConfigured() && identifier.includes("@")) {
          await requestSupabasePasswordReset(identifier);
          return NextResponse.json({
            ok: true,
            action: "forgotPassword",
            message: "If an account exists, a recovery link has been sent.",
          });
        }

        const normalizedPhone = normalizeSaudiPhone(identifier);
        const account =
          findAccountByEmail(identifier) ??
          (normalizedPhone ? findAccountByPhone(normalizedPhone) : undefined) ??
          findAccountByEmail(auth.user.email);

        if (!account || account.id !== auth.user.id) {
          return NextResponse.json({
            ok: true,
            message: "If an account exists, a recovery code has been sent.",
          });
        }

        const channel = body.channel ?? getRecoveryChannel(account.id);
        const code = generateOtpCode();
        const codeHash = await hashOtp(code);
        createPasswordResetRequest({
          accountId: account.id,
          email: account.email,
          channel,
          codeHash,
        });

        await serverDispatchNotification(
          buildTriggerNotification({
            trigger: "password_reset",
            title: "Password Reset Request",
            titleAr: "طلب إعادة تعيين كلمة المرور",
            body: `Your VORA password reset code is ${code}.`,
            bodyAr: `رمز إعادة تعيين كلمة المرور في VORA: ${code}.`,
            href: "/auth/reset-password",
            channels: channel === "sms" ? ["in_app"] : ["email", "in_app"],
          }),
          {
            recipientEmail: channel === "email" ? account.email : undefined,
            accountId: account.id,
          }
        );

        if (channel === "sms" && account.phone) {
          try {
            assertOtpProviderReady("sms");
            const provider = getConfiguredOtpProvider();
            await provider.send({
              phoneE164: account.phone,
              code,
              channel: "sms",
              purpose: "password_reset",
            });
          } catch (error) {
            if (error instanceof NotificationProviderNotReadyError) {
              return NextResponse.json(
                { error: error.message, reasons: error.reasons },
                { status: 503 }
              );
            }
            console.error(
              "[profile/me] SMS delivery failed:",
              error instanceof Error ? error.message : error
            );
            return NextResponse.json({ error: "Failed to send recovery SMS" }, { status: 502 });
          }
        }

        return NextResponse.json({
          ok: true,
          action: "forgotPassword",
          channel,
          ...(process.env.NODE_ENV === "development" ? { devCode: code } : {}),
        });
      }

      case "resetPassword": {
        if (!body.newPassword) {
          return NextResponse.json({ error: "newPassword is required" }, { status: 400 });
        }

        if (isSupabaseConfigured() && !body.token) {
          const result = await resetSupabasePasswordWithSession(body.newPassword);
          if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: 400 });
          }
          return NextResponse.json({ ok: true, action: "resetPassword" });
        }

        if (!body.token || !body.code) {
          return NextResponse.json(
            { error: "token, code, and newPassword are required" },
            { status: 400 }
          );
        }
        const resetRequest = getPasswordResetRequest(body.token);
        if (!resetRequest || resetRequest.used || resetRequest.accountId !== auth.user.id) {
          return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
        }
        if (new Date(resetRequest.expiresAt).getTime() < Date.now()) {
          return NextResponse.json({ error: "Reset token has expired" }, { status: 400 });
        }
        if (!(await verifyOtp(body.code, resetRequest.codeHash))) {
          return NextResponse.json({ error: "Invalid recovery code" }, { status: 400 });
        }
        const result = await resetAccountPassword(auth.user.id, body.newPassword);
        if (!result.ok) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        markPasswordResetUsed(body.token);
        return NextResponse.json({ ok: true, action: "resetPassword" });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Profile security action failed" }, { status: 500 });
  }
}
