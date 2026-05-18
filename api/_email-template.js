// ─────────────────────────────────────────────────────────────────────────────
// api/_email-template.js
// Beautiful HTML email — renders the letter as a premium printed page
// Compatible with Gmail, Apple Mail, Outlook, and mobile clients
// ─────────────────────────────────────────────────────────────────────────────

export function buildEmailHtml({ letterContent, packageName, occasionLabel, toneLabel }) {
  // Convert plain text letter into paragraphs
  const paragraphs = letterContent
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p style="margin:0 0 22px 0;line-height:1.9;color:#2a1f10;font-size:17px;">${p.replace(/\n/g, "<br>")}</p>`)
    .join("\n");

  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Your letter is ready — Last Word</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f0ebe0;font-family:Georgia,'Times New Roman',serif;">

  <!-- Preheader (hidden preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f0ebe0;">
    Your letter has been written and is ready to read. ‌‌‌‌‌‌‌‌‌‌‌‌‌‌
  </div>

  <!-- Email wrapper -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f0ebe0;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Card container — max 600px -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;">

          <!-- ── HEADER ── -->
          <tr>
            <td style="padding-bottom:28px;text-align:center;">
              <div style="font-family:Georgia,serif;font-size:28px;font-style:italic;font-weight:400;color:#9a7a3a;letter-spacing:0.04em;">
                Last Word
              </div>
              <div style="font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#a0907a;margin-top:4px;">
                Letters that matter
              </div>
            </td>
          </tr>

          <!-- ── INTRO CARD ── -->
          <tr>
            <td style="background-color:#faf6ee;border:1px solid #e0d8c8;border-radius:4px 4px 0 0;padding:32px 40px 28px;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.25em;text-transform:uppercase;color:#9a7a3a;">
                ✦ &nbsp; Your letter is ready
              </p>
              <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:30px;font-weight:400;font-style:italic;color:#1a1510;line-height:1.2;">
                We found your words.
              </h1>
              <p style="margin:0;font-size:15px;color:#7a6e60;line-height:1.7;font-style:italic;">
                Below is your ${occasionLabel.toLowerCase()} — written with everything you shared.
                ${toneLabel ? `Tone: <strong style="color:#9a7a3a;font-weight:400;">${toneLabel}</strong>.` : ""}
              </p>
            </td>
          </tr>

          <!-- ── DECORATIVE DIVIDER ── -->
          <tr>
            <td style="background-color:#f5f0e4;border-left:1px solid #e0d8c8;border-right:1px solid #e0d8c8;padding:0;">
              <div style="height:1px;background:linear-gradient(90deg,transparent,#d4c8a8,transparent);margin:0 40px;"></div>
            </td>
          </tr>

          <!-- ── THE LETTER ── -->
          <tr>
            <td style="background-color:#fdfaf4;border-left:1px solid #e0d8c8;border-right:1px solid #e0d8c8;padding:44px 48px 40px;">

              <!-- Opening quote mark -->
              <div style="font-family:Georgia,serif;font-size:72px;line-height:0.6;color:#e8e0ce;margin-bottom:24px;display:block;">
                &ldquo;
              </div>

              <!-- Letter body -->
              <div style="font-family:Georgia,'Times New Roman',serif;">
                ${paragraphs}
              </div>

            </td>
          </tr>

          <!-- ── BOTTOM RULE ── -->
          <tr>
            <td style="background-color:#f5f0e4;border-left:1px solid #e0d8c8;border-right:1px solid #e0d8c8;padding:0;">
              <div style="height:1px;background:linear-gradient(90deg,transparent,#d4c8a8,transparent);margin:0 40px;"></div>
            </td>
          </tr>

          <!-- ── PACKAGE + CTA ── -->
          <tr>
            <td style="background-color:#faf6ee;border:1px solid #e0d8c8;border-top:0;border-radius:0 0 4px 4px;padding:28px 40px 32px;text-align:center;">

              <!-- Package badge -->
              <div style="display:inline-block;background:#f0e8d4;border:1px solid #d4c8a8;border-radius:20px;padding:6px 18px;font-size:12px;letter-spacing:0.15em;text-transform:uppercase;color:#9a7a3a;margin-bottom:20px;">
                ${packageName} package
              </div>

              <!-- Tip for Premium/Legacy -->
              ${packageName !== "Essential" ? `
              <p style="margin:0 0 20px;font-size:14px;color:#7a6e60;line-height:1.7;font-style:italic;">
                ${packageName === "Premium"
                  ? "Your Premium package includes two revision rounds. Reply to this email with any changes and we'll rewrite within 24 hours."
                  : "Your letter has been stored in your Legacy Vault. We'll remind you annually to review or update it."}
              </p>` : ""}

              <!-- Print/download suggestion -->
              <p style="margin:0 0 24px;font-size:14px;color:#7a6e60;line-height:1.7;">
                Print this email to keep a physical copy, or forward it directly to the person it's for.
              </p>

              <!-- Divider -->
              <div style="height:1px;background:#e0d8c8;margin:0 0 24px;"></div>

              <p style="margin:0;font-size:13px;color:#a0907a;line-height:1.6;">
                Written by Last Word &nbsp;·&nbsp; Powered by Claude AI &nbsp;·&nbsp; Payments by Stripe<br>
                <a href="https://lastword.co.uk" style="color:#9a7a3a;text-decoration:none;">lastword.co.uk</a>
              </p>
            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="padding:24px 0 8px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#b0a090;line-height:1.7;">
                © ${year} Last Word. All rights reserved.<br>
                You received this because you purchased a letter at lastword.co.uk.<br>
                <a href="https://lastword.co.uk/unsubscribe" style="color:#b0a090;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
        <!-- /card container -->

      </td>
    </tr>
  </table>

</body>
</html>`;
}
