// api/create-checkout.js
// Vercel serverless function — creates a Stripe Checkout session

export default async function handler(req, res) {

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, packageId, packageName, letter, occasionLabel, toneLabel } = req.body;

  if (!email || !packageId) {
    return res.status(400).json({ error: 'Missing email or packageId' });
  }

  const PRICE_IDS = {
    essential: process.env.PRICE_ESSENTIAL,
    premium: process.env.PRICE_PREMIUM,
    legacy: process.env.PRICE_LEGACY,
  };

  const priceId = PRICE_IDS[packageId];

  if (!priceId) {
    return res.status(400).json({ error: `Unknown package: ${packageId}` });
  }

  try {
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'payment',
        'customer_email': email,
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        'success_url': 'https://lastwordletters.com/success?session_id={CHECKOUT_SESSION_ID}',
        'cancel_url': 'https://lastwordletters.com/app',
        'metadata[packageId]': packageId,
        'metadata[packageName]': packageName || '',
        'metadata[occasionLabel]': occasionLabel || '',
        'metadata[toneLabel]': toneLabel || '',
        'metadata[letterPreview]': (letter || '').slice(0, 490),
      }).toString(),
    });

    if (!stripeResponse.ok) {
      const errorData = await stripeResponse.json();
      console.error('Stripe API error:', errorData);
      return res.status(500).json({ error: 'Payment setup failed', details: errorData });
    }

    const session = await stripeResponse.json();
    return res.status(200).json({ url: session.url });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
