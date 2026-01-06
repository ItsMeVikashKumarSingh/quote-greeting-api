import { GoogleGenAI } from '@google/genai';

const MODELS = ['gemini-3-pro-preview', 'gemini-3-flash-preview', 'gemini-2.5-flash-lite'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');

  try {
    const body = req.body || {};
    const history = body.history || (req.query.history ? JSON.parse(req.query.history) : []);
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const historyText = history.length > 0 
      ? `\n\nDO NOT REPEAT THESE QUOTES:\n${history.slice(0, 10).map((q, i) => `${i+1}. ${q}`).join('\n')}\n` 
      : '';

    const prompt = `Generate ONE UNIQUE inspirational quote.
<quote>"Quote text here"
<author>Author Name
${historyText}
REQUIREMENTS:
- Use exact format above.
- Must be a full quote and a real author name.`;

    for (const modelId of MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelId,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { temperature: 0.8, maxOutputTokens: 250 } // Plenty of room for full text
        });

        const text = response.text.trim();
        if (text.includes('<quote>') && text.includes('<author>')) {
          return res.status(200).send(text);
        }
      } catch (err) {
        if (err.message.includes('429')) continue;
        throw err;
      }
    }
    throw new Error("Failed");
  } catch (error) {
    res.status(200).send('<quote>"The only way to do great work is to love what you do."\n<author>Steve Jobs');
  }
}