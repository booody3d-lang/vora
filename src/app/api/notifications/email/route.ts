import { NextResponse } from "next/server";
import { buildEmailHtml } from "@/lib/notifications/email-templates";
import { sendEmail } from "@/lib/email/send";
import { resolveEmailLocale } from "@/lib/email/email-i18n";
import { isValidEmailAddress } from "@/lib/email/config";
import { resolveActiveEmailProvider, getEmailProviderLabel } from "@/lib/email/email-provider";
import { NotificationProviderNotReadyError } from "@/lib/notifications/provider-errors";
import { requireAuthenticatedApiUser } from "@/lib/security/require-api-auth";

export async function GET() {
  const provider = resolveActiveEmailProvider();
  return NextResponse.json({
    provider,
    providerLabel: getEmailProviderLabel(provider),
    configured: provider === "resend",
  });
}

export async function POST(request: Request) {
  const authResult = await requireAuthenticatedApiUser();
  if ("response" in authResult) return authResult.response;

  try {
    const body = (await request.json()) as {
      to?: string;
      subject: string;
      body: string;
      bodyAr?: string;
      subjectAr?: string;
      trigger?: string;
      ctaUrl?: string;
      amountSar?: number;
      locale?: "en" | "ar";
    };

    const to = (body.to ?? authResult.auth.user.email)?.trim();
    if (!to || !isValidEmailAddress(to)) {
      return NextResponse.json({ error: "Valid recipient email is required" }, { status: 400 });
    }

    const locale = resolveEmailLocale({
      locale: body.locale,
      titleAr: body.subjectAr,
      bodyAr: body.bodyAr,
    });

    const html = buildEmailHtml({
      title: body.subject,
      body: body.body,
      titleAr: body.subjectAr,
      bodyAr: body.bodyAr,
      locale,
      ctaUrl: body.ctaUrl,
      amountSar: body.amountSar,
    });

    const result = await sendEmail({
      to,
      subject: locale === "ar" && body.subjectAr ? body.subjectAr : body.subject,
      html,
      text: locale === "ar" && body.bodyAr ? body.bodyAr : body.body,
      trigger: body.trigger,
      locale,
    });

    return NextResponse.json({
      success: true,
      provider: result.provider,
      queued: result.queued,
      sent: result.sent,
      messageId: result.messageId,
      skipped: result.skipped,
      error: result.error,
    });
  } catch (error) {
    if (error instanceof NotificationProviderNotReadyError) {
      return NextResponse.json(
        { error: error.message, reasons: error.reasons },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Email dispatch failed" }, { status: 500 });
  }
}
