// ─────────────────────────────────────────────────────────────────────────────
// api/stripe-webhook.js
// Vercel Serverless Function
//
// WHAT THIS DOES:
//   1. Listens for Stripe "checkout.session.completed" events
//   2. Verifies the webhook signature (security)
//   3. Extracts the customer email + letter content from Stripe metadata
//   4. Sends the beautifully formatted letter via Resend
//
// SETUP:
//   1. npm install stripe resend  (in your project root)
//   2. Add these to your Vercel environment variables:
//        STRIPE_SECRET_KEY        → from Stripe Dashboard → Developers → API Keys
//        STRIPE_WEBHOOK_SECRET    → from Stripe Dashboard → Webhooks → your endpoint
//        RESEND_API_KEY           → from resend.com → API Keys
//        FROM_EMAIL               → e.g. letters@lastword.co.uk (must be verified in Resend)
//   3. In Stripe Dashboard → Webhooks → Add endpoint:
//        URL: https://your-app.vercel.app/api/stripe-webhook
//        Events: checkout.session.completed
// ─────────────────────────────────────────────────────────────────────────────

import Stripe from "stripe";
import { Resend } from "resend";
import { buildEmailHtml } from "./_email-template.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

// Vercel requires raw body for Stripe signature verification
export const config = {
  api: { bodyParser: false },
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── 1. Verify Stripe signature ──────────────────────────────────────────────
  const rawBody = await getRawBody(req);
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Stripe webhook signature failed:", err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  // ── 2. Handle checkout.session.completed ────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const customerEmail = session.customer_details?.email || session.metadata?.email;
    const letterContent  = session.metadata?.letter;        // stored when creating the session
    const packageName    = session.metadata?.package_name || "Essential";
    const occasionLabel  = session.metadata?.occasion      || "Personal letter";
    const toneLabel      = session.metadata?.tone          || "";

    if (!customerEmail || !letterContent) {
      console.error("Missing email or letter in session metadata", session.id);
      return res.status(400).json({ error: "Missing metadata" });
    }

    // ── 3. Send the letter via Resend ──────────────────────────────────────────
    try {
      await resend.emails.send({
        from:    process.env.FROM_EMAIL,           // e.g. "Last Word <letters@lastword.co.uk>"
        to:      customerEmail,
        subject: `Your letter is ready — Last Word`,
        html:    buildEmailHtml({ letterContent, packageName, occasionLabel, toneLabel }),
        // Plain text fallback
        text:    buildPlainText({ letterContent, occasionLabel }),
      });

      console.log(`Letter sent to ${customerEmail} for session ${session.id}`);
      return res.status(200).json({ received: true });

    } catch (emailErr) {
      console.error("Resend delivery failed:", emailErr);
      return res.status(500).json({ error: "Email delivery failed" });
    }
  }

  // Acknowledge all other event types
  return res.status(200).json({ received: true });
}

function buildPlainText({ letterContent, occasionLabel }) {
  return `Your Last Word letter\n${"─".repeat(40)}\n\n${letterContent}\n\n${"─".repeat(40)}\nOccasion: ${occasionLabel}\n\nThank you for using Last Word.\nlastword.co.uk`;
}
