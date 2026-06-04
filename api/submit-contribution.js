// api/submit-contribution.js
// Saves a contributor's answers to Upstash

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId, contributorName, answers } = req.body;

  if (!orderId || !contributorName || !answers) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    // Check order exists
    const orderRes = await fetch(`${upstashUrl}/get/collective:${orderId}`, {
      headers: { Authorization: `Bearer ${upstashToken}` },
    });
    const orderData = await orderRes.json();

    if (!orderData.result) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Build contribution object
    const contribution = {
      name: contributorName,
      answers,
      submittedAt: new Date().toISOString(),
    };

    // Push to contributions list
    const pushRes = await fetch(`${upstashUrl}/rpush/contributions:${orderId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${upstashToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([JSON.stringify(contribution)]),
    });

    const pushData = await pushRes.json();

    if (pushData.error) {
      throw new Error(pushData.error);
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('submit-contribution error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
