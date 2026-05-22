// api/generate-letter.js
// Vercel serverless function — calls Anthropic API server-side

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { occasion, tone, answers, questions } = req.body;

  if (!occasion || !tone || !answers) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Build the Q&A block from user answers
  const qaBlock = (questions || [])
    .map(q => {
      const val = answers[q.id]?.trim();
      return val ? `${q.label}\n→ ${val}` : null;
    })
    .filter(Boolean)
    .join('\n\n');

  const prompt = `You are a master letter writer — deeply human, emotionally intelligent, and literary without being flowery. Your letters have made people weep and reconcile and forgive.

Write a personal letter for someone with the following context:

OCCASION: ${occasion}

REQUESTED TONE: ${tone}

WHAT THEY SHARED:

${qaBlock}

INSTRUCTIONS:
- Write 4–6 paragraphs. No more.
- Use their own words and phrases back where powerful — if they wrote "too proud and too stupid", let that land in the letter.
- Name the specific memory they shared. Make it vivid.
- Do NOT resolve everything neatly. Real letters leave a door open, not a bow tied.
- Avoid clichés: no "words cannot express", no "at the end of the day", no "from the bottom of my heart".
- The silence between people is often more painful than the original wound — acknowledge it.
- Write in first person. Do not use placeholder names like [Name].
- Begin directly with the letter. No preamble, no title, no "Dear [X]:" — just the first sentence of the letter itself.
- Make it feel like it could only have been written by this specific person, about this specific person.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Anthropic API error:', errorData);
      return res.status(500).json({ error: 'Letter generation failed', details: errorData });
    }

    const data = await response.json();
    const letter = data.content?.map(b => b.text || '').join('') || '';

    return res.status(200).json({ letter });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
