import { GoogleGenAI } from '@google/genai';

const MODELS = ['gemini-3-flash-preview', 'gemini-2.5-flash-lite'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const { wishType = 'day', history = [] } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const historyText = history.length ? `\nAvoid these: ${history.slice(-5).join('; ')}` : '';
    const prompt = `Write ONE COMPLETE, inspiring ${wishType} wish sentence. 
    It MUST be a full sentence. ${historyText}\n\nWish:`;

    for (const modelId of MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelId,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { 
            temperature: 1.0, 
            maxOutputTokens: 200 // Increased from 30 to prevent truncation
          }
        });

        const wish = response.text.trim().replace(/^["'`•*-]+|["'`•*-]+$/g, '').split('\n')[0].trim();
        
        // Quality Check: Ensure the wish is a real sentence
        if (wish.split(' ').length >= 4) {
          return res.status(200).json({ type: 'wish', wish, wishType, model: modelId });
        }
      } catch (err) {
        if (err.message.includes('429')) continue;
        throw err;
      }
    }
    throw new Error("Truncated");
  } catch (error) {
    res.status(200).json({ wish: "Have a wonderful day!", source: 'fallback' });
  }
}