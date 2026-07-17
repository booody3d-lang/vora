export function buildEmailHtml(params: {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  amountSar?: number;
}): string {
  const { title, body, ctaLabel, ctaUrl, amountSar } = params;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <tr>
      <td style="background:linear-gradient(135deg,#3B5998,#1E293B);padding:24px 32px">
        <h1 style="margin:0;color:#fff;font-size:22px">VORA</h1>
        <p style="margin:4px 0 0;color:#93C5FD;font-size:12px">Professional Network & Freelance Marketplace</p>
      </td>
    </tr>
    <tr>
      <td style="padding:32px">
        <h2 style="margin:0 0 12px;color:#0F172A;font-size:18px">${title}</h2>
        <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6">${body}</p>
        ${amountSar !== undefined ? `<p style="margin:0 0 16px;font-size:24px;font-weight:bold;color:#EA580C">SR ${amountSar.toLocaleString("en-SA")}</p>` : ""}
        ${ctaUrl ? `<a href="${ctaUrl}" style="display:inline-block;background:#3B5998;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px">${ctaLabel ?? "View in VORA"}</a>` : ""}
      </td>
    </tr>
    <tr>
      <td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0">
        <p style="margin:0;color:#94a3b8;font-size:11px">VORA · Saudi Riyal (SR) · Manage notification preferences in your profile settings.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
