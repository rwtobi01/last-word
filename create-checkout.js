// ─────────────────────────────────────────────────────────────────────────────
// api/create-checkout.js
// Vercel Serverless Function
//
// WHAT THIS DOES:
//   Creates a Stripe Checkout Session programmatically, embedding the letter
//   content and customer details into the session metadata so the webhook
//   can retrieve them after payment.
//
// WHY THIS APPROACH (vs Payment Links):
//   Payment Links can't carry dynamic metadata (the letter text).
//   This function creates a fresh session each time with the letter embedded,
//   so the webhook knows exactly what to send after payment.
//
// CALLED FROM:
//   The React frontend — replace the window.open(STRIPE_LINKS...) call
//   in last-word-pro.jsx with a fetch to /api/create-checkout
//
// SETUP:
//   Add to Vercel env variables:
//     STRIPE_SECRET_KEY     → Stripe Dashboard → Developers → API Keys
//     NEXT_PUBLIC_BASE_URL  → https://your-app.vercel.app
// ─────────────────────────────────────────────────────────────────────────────

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Price IDs — create these in Stripe Dashboard → Products → Add product
// Then paste the price_xxx IDs here
const PRICE_IDS = {
  essential: "price_REPLACE_WITH_ESSENTIAL_PRICE_ID",
  premium:   "price_REPLACE_WITH_PREMIUM_PRICE_ID",
  legacy:    "price_REPLACE_WITH_LEGACY_PRICE_ID",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, packageId, letter, occasionLabel, toneLabel, packageName } = req.body;

  // Validate required fields
  if (!email || !packageId || !letter) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Stripe metadata values must be strings under 500 chars each
  // Letter may be long — truncate for metadata, full version stored separately
  // For production: store letter in your DB and pass only the record ID
  const letterTruncated = letter.length > 490 ? letter.slice(0, 490) + "…" : letter;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],

      // Pre-fill customer email
      customer_email: email,

      line_items: [
        {
          price: PRICE_IDS[packageId],
          quantity: 1,
        },
      ],

      // Embed letter + context into session metadata
      // The webhook reads this to send the email
      metadata: {
        package_id:    packageId,
        package_name:  packageName || packageId,
        occasion:      occasionLabel || "",
        tone:          toneLabel || "",
        email:         email,
        // NOTE: For long letters, save to DB first and store only the record ID here
        letter:        letterTruncated,
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
