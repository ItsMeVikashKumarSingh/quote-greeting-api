import { GoogleGenAI } from '@google/genai';

const MODELS = ['gemini-3-flash-preview', 'gemini-2.5-flash-lite'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });

  try {
    const { wishType = 'day', history = [] } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const historyText = history.length ? `\nAvoid these previous wishes: ${history.slice(-5).join('; ')}` : '';
    const prompt = `ONE ${wishType} wish (8-15 words):${historyText}\nWish:`;

    for (const modelId of MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelId,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { temperature: 1.3, maxOutputTokens: 100 }
        });

        const wish = response.text.trim().replace(/^["'`•*-]+|["'`•*-]+$/g, '').split('\n')[0];
        return res.status(200).json({
          type: 'wish',
          wish,
          wishType,
          source: 'ai',
          model: modelId,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        if (err.message.includes('429')) continue;
        throw err;
      }
    }
  } catch (error) {
    res.status(200).json({ wish: "Have a great day!", source: 'fallback', timestamp: new Date().toISOString() });
  }
}