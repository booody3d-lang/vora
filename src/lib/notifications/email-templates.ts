import { SITE_URL } from "@/i18n/config";
import type { Locale } from "@/i18n/config";
import { VORA_LOGO } from "@/lib/brand/logo";
import { EMAIL_COPY, escapeHtml, resolveEmailLocale } from "@/lib/email/email-i18n";

export function buildEmailHtml(params: {
  title: string;
  body: string;
  titleAr?: string;
  bodyAr?: string;
  locale?: Locale;
  ctaLabel?: string;
  ctaUrl?: string;
  amountSar?: number;
}): string {
  const locale = resolveEmailLocale(params);
  const copy = EMAIL_COPY[locale];
  const title = locale === "ar" && params.titleAr ? params.titleAr : params.title;
  const body = locale === "ar" && params.bodyAr ? params.bodyAr : params.body;
  const dir = locale === "ar" ? "rtl" : "ltr";
  const align = locale === "ar" ? "right" : "left";
  const logoUrl = `${SITE_URL}${VORA_LOGO.src}`;

  const safeTitle = escapeHtml(title);
  const safeBody = escapeHtml(body);
  const safeCta = escapeHtml(params.ctaLabel ?? copy.ctaDefault);
  const safeTagline = escapeHtml(copy.tagline);
  const safeFooter = escapeHtml(copy.footer);

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;direction:${dir}">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <tr>
      <td style="background:#0F172A;padding:24px 32px;text-align:center">
        <img src="${logoUrl}" alt="VORA" width="180" height="69" style="display:inline-block;height:56px;width:auto;max-width:100%;background:transparent" />
        <p style="margin:12px 0 0;color:#93C5FD;font-size:12px">${safeTagline}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;text-align:${align}">
        <h2 style="margin:0 0 12px;color:#0F172A;font-size:18px">${safeTitle}</h2>
        <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6">${safeBody}</p>
        ${
          params.amountSar !== undefined
            ? `<p style="margin:0 0 16px;font-size:24px;font-weight:bold;color:#EA580C">${copy.amountPrefix} ${params.amountSar.toLocaleString(locale === "ar" ? "ar-SA" : "en-SA")}</p>`
            : ""
        }
        ${
          params.ctaUrl
            ? `<a href="${escapeHtml(params.ctaUrl)}" style="display:inline-block;background:#3B5998;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px">${safeCta}</a>`
            : ""
        }
      </td>
    </tr>
    <tr>
      <td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:${align}">
        <p style="margin:0;color:#94a3b8;font-size:11px">${safeFooter}</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
