// api/stripe-webhook.js
// Vercel serverless function — handles Stripe payment confirmation
// and sends the letter to the customer via Resend email

import Stripe from 'stripe';

// Required to parse raw body for Stripe signature verification
export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  // Only handle successful payments
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
    console.error('No customer email found in session');
    return res.status(200).json({ received: true });
  }

  // Send the letter via Resend
  try {
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL || 'Last Word <letters@lastwordletters.com>',
        to: customerEmail,
        subject: 'Your Last Word letter is ready',
        html: buildEmailHTML({ letter, packageName, occasionLabel, toneLabel, customerEmail }),
        text: buildEmailText({ letter, packageName }),
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error('Resend error:', errorData);
      return res.status(500).json({ error: 'Email delivery failed' });
    }

    console.log(`Letter sent to ${customerEmail}`);
    return res.status(200).json({ received: true, sent: true });

  } catch (err) {
    console.error('Email send error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── EMAIL TEMPLATES ──────────────────────────────────────────────────────────

function buildEmailHTML({ letter, packageName, occasionLabel, toneLabel, customerEmail }) {
  const letterHTML = (letter || '')
    .split('\n\n')
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p style="margin:0 0 20px 0;line-height:1.9;">${p}</p>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Your Last Word Letter</title>
</head>
<body style="margin:0;padding:0;background:#f5f0e6;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="text-align:center;padding-bottom:32px;">
              <div style="font-family:Georgia,serif;font-size:26px;font-style:italic;color:#9a7a3a;letter-spacing:0.05em;">
                Last Word
              </div>
              <div style="font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#8a7a68;margin-top:4px;">
                The letter you owe someone
              </div>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="text-align:center;padding-bottom:28px;">
              <p style="color:#4a3f32;font-style:italic;font-size:17px;line-height:1.7;margin:0;">
                Your ${packageName} letter is ready.<br/>
                ${occasionLabel ? `Written for: <em>${occasionLabel}</em>` : ''}
              </p>
            </td>
          </tr>

          <!-- Letter paper -->
          <tr>
            <td style="background:#fdfaf4;border:1px solid #e8e0ce;border-radius:3px;padding:44px 48px;box-shadow:0 2px 16px rgba(154,122,58,0.07);">
              <div style="font-family:Georgia,serif;font-size:16px;color:#2a1f10;">
                ${letterHTML || '<p style="color:#8a7a68;font-style:italic;">Your full letter has been generated. If you don\'t see it here, please contact us and we\'ll resend it right away.</p>'}
              </div>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:32px 0 24px;text-align:center;">
              <div style="height:1px;background:#d4c9b8;"></div>
            </td>
          </tr>

          <!-- Footer note -->
          <tr>
            <td style="text-align:center;padding-bottom:16px;">
              <p style="font-size:13px;color:#8a7a68;font-style:italic;line-height:1.7;margin:0;">
                This letter was written for you alone — private, personal, and yours.<br/>
                ${packageName === 'Premium' ? 'Your two revision rounds are included. Simply reply to this email to request changes.' : ''}
              </p>
            </td>
          </tr>

          <!-- Contact -->
          <tr>
            <td style="text-align:center;padding-bottom:8px;">
              <p style="font-size:12px;color:#b0a090;margin:0;">
                Questions? Reply to this email or visit
                <a href="https://www.lastwordletters.com" style="color:#9a7a3a;text-decoration:none;">lastwordletters.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildEmailText({ letter, packageName }) {
  return `YOUR LAST WORD LETTER
─────────────────────

${letter || 'Your letter has been generated. Please contact us if you need it resent.'}

─────────────────────
${packageName === 'Premium' ? 'Your two revision rounds are included. Reply to this email to request changes.' : ''}

Questions? Visit lastwordletters.com
`;
}
