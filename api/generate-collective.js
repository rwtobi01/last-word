// api/generate-collective.js
// Fetches all contributions, generates the letter, sends via Resend

import { getEmailTemplate } from './_email-template.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId, email } = req.body;

  if (!orderId || !email) {
    return res.status(400).json({ error: 'Missing orderId or email' });
  }

  try {
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    // Get order data
    const orderRes = await fetch(`${upstashUrl}/get/collective:${orderId}`, {
      headers: { Authorization: `Bearer ${upstashToken}` },
    });
    const orderData = await orderRes.json();

    if (!orderData.result) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = JSON.parse(orderData.result);

    // Get all contributions
    const contribRes = await fetch(`${upstashUrl}/lrange/contributions:${orderId}/0/-1`, {
      headers: { Authorization: `Bearer ${upstashToken}` },
    });
    const contribData = await contribRes.json();

    const contributions = (contribData.result || []).map(c => JSON.parse(c));

    if (contributions.length === 0) {
      return res.status(400).json({ error: 'No contributions yet' });
    }

    // Build the prompt
    const contributionsText = contributions.map((c, i) => {
      const answersText = Object.entries(c.answers)
        .filter(([, v]) => v && v.trim())
        .map(([, v]) => `- ${v.trim()}`)
        .join('\n');
      return `Contributor ${i + 1} — ${c.name}:\n${answersText}`;
    }).join('\n\n');

    const prompt = `You are writing a deeply personal, beautifully crafted group letter on behalf of a community of people.

The letter is for: ${order.recipientName}
Their role: ${order.recipientRole}
Occasion: ${order.occasionLabel}
${order.context ? `Additional context: ${order.context}` : ''}

The following contributions have been submitted by members of the group. Each person has shared their own memories, observations, and words:

${contributionsText}

Write a single, cohesive letter that:
- Weaves together the voices of all contributors into one unified letter
- Feels personal and specific — use the actual memories and details shared
- Acknowledges individual contributors naturally within the flow (e.g. "Sarah remembers the time you..." or "We all noticed how...")
- Has warmth, depth, and emotional weight appropriate to the occasion
- Opens with something memorable and closes with something lasting
- Is addressed directly to ${order.recipientName}
- ONLY use details, facts, memories, and specific information provided in the contributions above. Do not invent, assume, or add any detail not explicitly shared. If something was not mentioned, write around the absence — do not fill it in.

- Signed "With love and gratitude, [all our names]" listing all contributor names

Write the full letter now. Do not include any preamble or explanation — just the letter itself.`;

    // Generate with Anthropic
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const anthropicData = await anthropicRes.json();
    const letter = anthropicData.content?.[0]?.text;

    if (!letter) {
      throw new Error('Letter generation failed');
    }

    // Send via Resend
    const emailHtml = getEmailTemplate({
      letter,
      packageName: 'One Voice, Many Hearts',
      recipientEmail: email,
    });

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL,
        to: email,
        subject: `Your letter for ${order.recipientName} — One Voice, Many Hearts`,
        html: emailHtml,
      }),
    });

    const resendData = await resendRes.json();

    if (resendData.error) {
      throw new Error(resendData.error.message || 'Email send failed');
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('generate-collective error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
