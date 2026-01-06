import { GoogleGenAI } from '@google/genai';

const MODELS = ['gemini-3-pro-preview', 'gemini-3-flash-preview', 'gemini-2.5-flash-lite'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');

  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const ai = new GoogleGenAI({ apiKey });

    // Use Vercel's built-in body helper for simpler history extraction
    const body = req.body || {};
    const history = body.history || (req.query.history ? JSON.parse(req.query.history) : []);

    const historyText = history.length > 0 
      ? `\n\nPREVIOUSLY GENERATED QUOTES (DO NOT REPEAT):\n${history.slice(0, 10).map((q, i) => `${i+1}. ${q}`).join('\n')}\n` 
      : '';

    const prompt = `Generate ONE UNIQUE inspirational quote in this format:
<quote>"Quote text here"
<author>Author Name
${historyText}
REQUIREMENTS:
- Completely different from above quotes.
- Use diverse topics: success, courage, wisdom, etc.
Return ONLY the quote in exact format.`;

    for (const modelId of MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelId,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { temperature: 1.2, maxOutputTokens: 250 }
        });

        const text = response.text.trim();
        if (text.includes('<quote>') && text.includes('<author>')) {
          return res.status(200).send(text);
        }
      } catch (err) {
        if (err.message.includes('429')) continue; // Try next model on quota limit
        throw err;
      }
    }
    throw new Error("Quota Full");
  } catch (error) {
    res.status(200).send('<quote>"Success is not final, failure is not fatal."\n<author>Winston Churchill');
  }
}