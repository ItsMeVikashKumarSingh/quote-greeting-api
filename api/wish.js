import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const { wishType = 'day', history = [] } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemma-3-12b-it',
      systemInstruction: `You are a direct Wish API. Do not ask for context. Simply generate a beautiful ${wishType} wish sentence. Return ONLY the wish text.`,
      contents: [{ 
        role: 'user', 
        parts: [{ text: `Write a unique ${wishType} wish. Avoid: [${history.join(', ')}].` }] 
      }],
      config: { 
        temperature: 1.4, 
        maxOutputTokens: 100 
      }
    });

    const wish = response.text.trim().replace(/["]+/g, '');
    return res.status(200).json({ type: 'wish', wish, wishType, model: 'gemma-3-12b-it' });
  } catch (error) {
    res.status(200).json({ wish: "May your day be filled with unexpected joy!", source: 'fallback' });
  }
}