// api/generate-free-paragraph.js
// Generates a free opening paragraph and sends it via Resend

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { recipient, unsaid, email } = req.body;

  if (!recipient || !unsaid || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Generate paragraph with Anthropic
    const prompt = `You are a master letter writer — deeply human, emotionally intelligent, and literary without being flowery.

Write ONE opening paragraph for a personal letter with this context:

WHO THE LETTER IS FOR: ${recipient}

THE ONE THING THEY'VE NEVER BEEN ABLE TO SAY: ${unsaid}

INSTRUCTIONS:
- Write exactly one paragraph — 4 to 6 sentences maximum
- Begin directly with the letter — no "Dear [Name]", no title, no preamble
- Use their actual words and situation — make it feel specific, not generic
- The opening should name the thing that has been unsaid, without flinching
- Leave the reader wanting the rest of the letter
- No clichés: no "words cannot express", no "at the end of the day", no "from the bottom of my heart"
- Write in first person
- Make it feel like it could only have been written by this specific person, about this specific situation

Write only the paragraph. Nothing else.`;

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const anthropicData = await anthropicRes.json();
    const paragraph = anthropicData.content?.[0]?.text?.trim();

    if (!paragraph) {
      throw new Error('Generation failed');
    }

    // Send via Resend
    const emailHtml = buildEmailHTML({ paragraph, recipient });

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL,
        to: email,
        subject: 'Your opening paragraph — Last Word Letters',
        html: emailHtml,
      }),
    });

    return res.status(200).json({ paragraph });

  } catch (err) {
    console.error('generate-free-paragraph error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function buildEmailHTML({ paragraph, recipient }) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>Your opening paragraph</title></head>
<body style="margin:0;padding:0;background:#f5f0e6;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e6;padding:40px 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
      <tr><td style="text-align:center;padding-bottom:32px;">
        <div style="font-family:Georgia,serif;font-size:26px;font-style:italic;color:#9a7a3a;">Last Word Letters</div>
        <div style="font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#8a7a68;margin-top:4px;">The letter you owe someone</div>
      </td></tr>
      <tr><td style="text-align:center;padding-bottom:24px;">
        <p style="color:#4a3f32;font-style:italic;font-size:16px;line-height:1.7;margin:0;">
          Here is the opening of your letter.<br/>Keep it. Send it. Or let it be the beginning of something more.
        </p>
      </td></tr>
      <tr><td style="background:#fdfaf4;border:1px solid #e8e0ce;border-radius:3px;padding:40px 44px;position:relative;">
        <div style="font-family:Georgia,serif;font-size:64px;color:#e8d9b8;line-height:1;position:absolute;top:8px;left:16px;">"</div>
        <p style="font-family:Georgia,serif;font-size:16px;line-height:1.95;color:#2a1f10;margin:0;position:relative;">
          ${paragraph}
        </p>
      </td></tr>
      <tr><td style="padding:28px 0 8px;text-align:center;">
        <p style="font-size:15px;color:#4a3f32;font-style:italic;line-height:1.8;margin:0 0 20px;">
          This is just the beginning.<br/>
          The full letter — all four to six paragraphs — is waiting.
        </p>
        <a href="https://lastwordletters.com/app" style="display:inline-block;background:#9a7a3a;color:#fff;text-decoration:none;padding:13px 36px;font-family:Georgia,serif;font-size:15px;border-radius:2px;">
          Write the full letter →
        </a>
        <p style="font-size:12px;color:#8a7a68;font-style:italic;margin-top:10px;">From £15 · Ready in minutes · Delivered to your inbox</p>
      </td></tr>
      <tr><td style="padding:24px 0 0;text-align:center;">
        <p style="font-size:12px;color:#b0a090;margin:0;">
          Questions? Email <a href="mailto:hello@lastwordletters.com" style="color:#9a7a3a;">hello@lastwordletters.com</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}
