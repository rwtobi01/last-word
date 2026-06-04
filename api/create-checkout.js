// api/create-checkout.js
// Vercel serverless function — creates a Stripe Checkout session

export default async function handler(req, res) {

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, packageId, packageName, occasionLabel, toneLabel, metadata } = req.body

  if (!email || !packageId) {
    return res.status(400).json({ error: 'Missing email or packageId' })
  }

  const PRICE_IDS = {
    essential: process.env.PRICE_ESSENTIAL,
    premium: process.env.PRICE_PREMIUM,
    legacy: process.env.PRICE_LEGACY,
    unfinished: process.env.PRICE_UNFINISHED,
  };

  const priceId = PRICE_IDS[packageId];

  if (!priceId) {
    return res.status(400).json({ error: `Unknown package: ${packageId}` })
  }

  try {
    // Build URLSearchParams with all metadata fields for webhook
    const params = {
      'mode': 'payment',
      'customer_email': email,
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'success_url': 'https://lastwordletters.com/success.html',
      'cancel_url': 'https://lastwordletters.com/app',
    };

    // Pass all metadata fields through to Stripe
    const metaToStore = metadata || {};
    metaToStore.packageId = packageId;
    metaToStore.packageName = packageName || '';
    metaToStore.occasionLabel = occasionLabel || '';
    metaToStore.toneLabel = toneLabel || '';

    Object.entries(metaToStore).forEach(([key, value]) => {
      if (value) params[`metadata[${key}]`] = String(value).slice(0, 500);
    });

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(params).toString(),
    });

    if (!stripeResponse.ok) {
      const errorData = await stripeResponse.json();
      console.error('Stripe API error:', errorData);
      return res.status(500).json({ error: 'Payment setup failed' })
    }

    const session = await stripeResponse.json();
    return res.status(200).json({ url: session.url });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' })
  }
}
