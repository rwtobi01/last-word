// api/create-checkout.js
// Vercel Serverless Function — creates a Stripe Checkout Session

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRICE_IDS = {
  essential: "price_1TYxxZC0Q7K59nHLjNX5ppif",
  premium:   "price_1TYxzkC0Q7K59nHLsRpvcOiS",
  legacy:    "price_1TYy2bC0Q7K59nHLxpsOpu5t",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, packageId, letter, occasionLabel, toneLabel, packageName } = req.body;

  if (!email || !packageId || !letter) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const letterTruncated = letter.length > 490 ? letter.slice(0, 490) + "…" : letter;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [
        {
          price: PRICE_IDS[packageId],
          quantity: 1,
        },
      ],
      metadata: {
        package_id:   packageId,
        package_name: packageName || packageId,
        occasion:     occasionLabel || "",
        tone:         toneLabel || "",
        email:        email,
        letter:       letterTruncated,
      },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.NEXT_PUBLIC_BASE_URL}/?cancelled=true`,
    });

    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error("Stripe session creation failed:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
