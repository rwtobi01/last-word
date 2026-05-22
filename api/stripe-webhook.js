// api/stripe-webhook.js
// Vercel serverless function — no external dependencies required

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Stripe webhook signature verification (no SDK needed)
async function verifyStripeSignature(rawBody, signature, secret) {
  const encoder = new TextEncoder();
  const parts = signature.split(',');
  const timestamp = parts.find(p => p.startsWith('t=')).slice(2);
  const sig = parts.find(p => p.startsWith('v1=')).slice(3);

  const payload = `${timestamp}.${rawBody}`;
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const expected = Array.from(new Uint8Array(signed)).map(b => b.toString(16).padStart(2, '0')).join('');

  if (expected !== sig) throw new Error('Invalid signature');

  const ts = parseInt(timestamp, 10);
  if (Math.abs(Date.now() / 1000 - ts) > 300) throw new Error('Timestamp too old');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawBody = await getRawBody(req);
  const signature = req.headers['stripe-signature'];

  try {
    await verifyStripeSignature(
      rawBody.toString('utf8'),
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch (err) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  if (event.type !== 'checkout.session.completed') {
    return res.status(200).json({ received: true });
  }

  const session = event.data.object;
  const customerEmail = session.customer_email || session.customer_details?.email;
  const packageName = session.metadata?.packageName || 'Essential';
  const letter = session.metadata?.letterPreview || '';
  const occasionLabel = session.metadata?.occasionLabel || '';
  const toneLabel = session.metadata?.toneLabel || '';

  if (!customerEmail) {
    console.error('No customer email in session');
    return res.status(200).json({ received: true });
  }

  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL || 'Last Word <letters@lastwordletters.com>',
        to: customerEmail,
        subject: 'Your Last Word letter is ready',
        html: buildEmailHTML({ letter, packageName, occasionLabel, toneLabel }),
        text: buildEmailText({ letter, packageName }),
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.json();
      console.error('Resend error:', err);
      return res.status(500).json({ error: 'Email failed' });
    }

    console.log(`Letter sent to ${customerEmail}`);
    return res.status(200).json({ received: true, sent: true });

  } catch (err) {
    console.error('Email error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}

function buildEmailHTML({ letter, packageName, occasionLabel }) {
  const letterHTML = (letter || '')
    .split('\n\n')
    .map(p => p.trim()).filter(Boolean)
    .map(p => `<p style="margin:0 0 20px 0;line-height:1.9;">${p}</p>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>Your Last Word Letter</title></head>
<body style="margin:0;padding:0;background:#f5f0e6;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e6;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="text-align:center;padding-bottom:32px;">
          <div style="font-family:Georgia,serif;font-size:26px;font-style:italic;color:#9a7a3a;">Last Word</div>
          <div style="font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#8a7a68;margin-top:4px;">The letter you owe someone</div>
        </td></tr>
        <tr><td style="text-align:center;padding-bottom:24px;">
          <p style="color:#4a3f32;font-style:italic;font-size:17px;line-height:1.7;margin:0;">
            Your ${packageName} letter is ready.${occasionLabel ? `<br/>Written for: <em>${occasionLabel}</em>` : ''}
          </p>
        </td></tr>
        <tr><td style="background:#fdfaf4;border:1px solid #e8e0ce;border-radius:3px;padding:44px 48px;">
          <div style="font-family:Georgia,serif;font-size:16px;color:#2a1f10;">
            ${letterHTML || '<p style="color:#8a7a68;font-style:italic;">Your letter was generated. Please reply to this email if you need it resent.</p>'}
          </div>
        </td></tr>
        <tr><td style="padding:28px 0 16px;text-align:center;">
          <p style="font-size:13px;color:#8a7a68;font-style:italic;line-height:1.7;margin:0;">
            This letter was written for you alone — private, personal, and yours.<br/>
            ${packageName === 'Premium' ? 'Your two revision rounds are included. Simply reply to this email to request changes.' : ''}
          </p>
        </td></tr>
        <tr><td style="text-align:center;">
          <p style="font-size:12px;color:#b0a090;margin:0;">
            Questions? Visit <a href="https://www.lastwordletters.com" style="color:#9a7a3a;">lastwordletters.com</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildEmailText({ letter, packageName }) {
  return `YOUR LAST WORD LETTER\n─────────────────────\n\n${letter || 'Please reply to this email and we will resend your letter.'}\n\n─────────────────────\n${packageName === 'Premium' ? 'Your two revision rounds are included. Reply to request changes.\n\n' : ''}Questions? Visit lastwordletters.com\n`;
}
