import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const { wishType = 'day', history = [] } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Gemma 3 12B is fast and has 14.4k RPD
    const response = await ai.models.generateContent({
      model: 'gemma-3-12b',
      contents: [{ 
        role: 'user', 
        parts: [{ text: `Write a complete ${wishType} wish sentence (15-20 words). Avoid: [${history.join(', ')}]. Return ONLY the wish.` }] 
      }],
      config: { 
        temperature: 1.0, 
        maxOutputTokens: 150 // High limit ensures the sentence FINISHES
      }
    });

    const wish = response.text.trim().replace(/["]+/g, '');
    if (wish.split(' ').length > 4) { // Verification check
      return res.status(200).json({ type: 'wish', wish, wishType, model: 'gemma-3-12b' });
    }
    throw new Error("Truncated");
  } catch (error) {
    res.status(200).json({ wish: "Have an amazing day!", source: 'fallback' });
  }
}