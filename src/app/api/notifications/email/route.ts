import { NextResponse } from "next/server";
import { buildEmailHtml } from "@/lib/notifications/email-templates";
import { sendEmail } from "@/lib/email/send";
import { requireAuthenticatedApiUser } from "@/lib/security/require-api-auth";

export async function POST(request: Request) {
  const authResult = await requireAuthenticatedApiUser();
  if ("response" in authResult) return authResult.response;

  try {
    const body = await request.json() as {
      to: string;
      subject: string;
      body: string;
      trigger?: string;
      ctaUrl?: string;
      amountSar?: number;
    };

    const html = buildEmailHtml({
      title: body.subject,
      body: body.body,
      ctaUrl: body.ctaUrl,
      amountSar: body.amountSar,
    });

    const result = await sendEmail({
      to: body.to,
      subject: body.subject,
      html,
      text: body.body,
      trigger: body.trigger,
    });

    return NextResponse.json({
      success: true,
      provider: result.provider,
      queued: result.queued,
      message: "Email queued",
    });
  } catch {
    return NextResponse.json({ error: "Email dispatch failed" }, { status: 500 });
  }
}
