import { GoogleGenAI } from '@google/genai';

const MODELS = ['gemini-3-flash-preview', 'gemini-2.5-flash-lite'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const { greetingType = 'morning', history = [] } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const historyText = history.length ? `\nDon't use: ${history.slice(-3).join(', ')}` : '';
    const prompt = `ONE SHORT ${greetingType} greeting (3-8 words):${historyText}\nGreeting:`;

    for (const modelId of MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelId,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { temperature: 1.5, maxOutputTokens: 50 }
        });

        const greeting = response.text.trim().replace(/^["'`]/, '').split('\n')[0];
        return res.status(200).json({
          type: 'greeting',
          greeting,
          greetingType,
          modelUsed: modelId,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        if (err.message.includes('429')) continue;
        throw err;
      }
    }
  } catch (error) {
    res.status(200).json({ greeting: "Hello!", modelUsed: 'fallback' });
  }
}