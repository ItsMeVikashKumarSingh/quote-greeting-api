import { GoogleGenAI } from '@google/genai';

const MODELS = ['gemini-3-flash-preview', 'gemini-2.5-flash-lite'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const { greetingType = 'morning', history = [] } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const historyText = history.length ? `\nAvoid: ${history.slice(-3).join(', ')}` : '';

    for (const modelId of MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelId,
          contents: [{ role: 'user', parts: [{ text: `Short ${greetingType} greeting (complete phrase). ${historyText}` }] }],
          config: { temperature: 1.2, maxOutputTokens: 50 } // Sufficient for greetings
        });

        const greeting = response.text.trim().replace(/^["'`]|["'`]$/g, '').split('\n')[0];
        if (greeting.length > 2) {
          return res.status(200).json({ type: 'greeting', greeting, model: modelId });
        }
      } catch (err) {
        if (err.message.includes('429')) continue;
        throw err;
      }
    }
  } catch (error) {
    res.status(200).json({ greeting: "Good morning!", source: 'fallback' });
  }
}