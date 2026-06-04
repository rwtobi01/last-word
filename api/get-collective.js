// api/get-collective.js
// Returns order metadata for the contributor page

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Missing order ID' });
  }

  try {
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    const response = await fetch(`${upstashUrl}/get/collective:${id}`, {
      headers: { Authorization: `Bearer ${upstashToken}` },
    });

    const data = await response.json();

    if (!data.result) {
      return res.status(200).json({ found: false });
    }

    const order = JSON.parse(data.result);

    return res.status(200).json({
      found: true,
      recipientName: order.recipientName,
      recipientRole: order.recipientRole,
      occasionLabel: order.occasionLabel,
    });

  } catch (err) {
    console.error('get-collective error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
