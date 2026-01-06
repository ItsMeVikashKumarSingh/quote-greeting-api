import { GoogleGenAI } from '@google/genai';

const MODELS = ['gemini-3-pro-preview', 'gemini-3-flash-preview', 'gemini-2.5-flash-lite'];

export default async function handler(req, res) {
  // ... (headers) ...
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { history = [] } = req.body || {};

    const prompt = `Generate ONE UNIQUE inspirational quote.
<quote>"Quote text here"
<author>Author Name
${history.length ? `Avoid: ${history.slice(-5).join('; ')}` : ''}

CRITICAL: You MUST finish the response with the </author> tag. Do not truncate.`;

    for (const modelId of MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelId,
          systemInstruction: "Format: <quote>\"TEXT\"\\n<author>NAME. No extra text.",
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { 
            temperature: 0.8, 
            maxOutputTokens: 500 // Increased to prevent the author tag from being cut off
          }
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
    throw new Error("Validation failed");
  } catch (error) {
    res.status(200).send('<quote>"Success is not final, failure is not fatal."\n<author>Winston Churchill');
  }
}