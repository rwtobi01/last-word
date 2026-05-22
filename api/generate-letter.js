// api/generate-letter.js
// Vercel Serverless Function
// Receives the user's answers and calls Claude API server-side
// This keeps the API key secure and bypasses browser CORS restrictions

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { occasion, answers, tone, questions } = req.body;

  if (!occasion || !tone || !answers) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Build the prompt
  const qaBlock = questions
    .map(q => {
      const val = (answers[q.id] || "").trim();
      return val ? `${q.label}\n→ ${val}` : null;
    })
    .filter(Boolean)
    .join("\n\n");

  const prompt = `You are a master letter writer — deeply human, emotionally intelligent, and literary without being flowery.

Write a personal letter for someone with the following context:

OCCASION: ${occasion}
REQUESTED TONE: ${tone}

WHAT THEY SHARED:
${qaBlock}

INSTRUCTIONS:
- Write 4–6 paragraphs. No more.
- Use their own words and phrases back where powerful.
- Name the specific memory they shared. Make it vivid.
- Do NOT resolve everything neatly. Real letters leave a door open, not a bow tied.
- Avoid clichés: no "words cannot express", no "at the end of the day".
- Write in first person. Do not use placeholder names.
- Begin directly with the letter. No preamble, no title.
- Make it feel like it could only have been written by this specific person.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Claude API error:", error);
      return res.status(500).json({ error: "Letter generation failed" });
    }

    const data = await response.json();
    const text = data.content?.map(b => b.text || "").join("") || "";

    if (!text) {
      return res.status(500).json({ error: "Empty response from Claude" });
    }

    return res.status(200).json({ letter: text });

  } catch (err) {
    console.error("Generate letter error:", err);
    return res.status(500).json({ error: err.message });
  }
}
