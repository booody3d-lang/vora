import { NextResponse } from "next/server";
import { buildEmailHtml } from "@/lib/notifications/email-templates";

export async function POST(request: Request) {
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

    // Production: integrate Resend, SendGrid, or AWS SES
    console.info(`[VORA Email] To: ${body.to} | Subject: ${body.subject} | Trigger: ${body.trigger}`);

    return NextResponse.json({
      success: true,
      preview: html.slice(0, 200),
      message: "Email queued (configure SMTP/Resend in production)",
    });
  } catch {
    return NextResponse.json({ error: "Email dispatch failed" }, { status: 500 });
  }
}
