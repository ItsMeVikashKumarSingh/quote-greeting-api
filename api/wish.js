import { GoogleGenAI } from '@google/genai';

const MODELS = ['gemini-3-flash-preview', 'gemini-2.5-flash-lite'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });

  try {
    const { wishType = 'day', history = [] } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // Explicitly ask for a complete sentence
    const historyText = history.length ? `\nPreviously sent (DO NOT REPEAT): ${history.slice(-5).join('; ')}` : '';
    const prompt = `Write ONE complete, beautiful, and inspiring ${wishType} wish sentence. 
    It must be a full sentence (10-20 words). ${historyText}\n\nWish:`;

    for (const modelId of MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelId,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { 
            temperature: 1.0, 
            maxOutputTokens: 150 // Increased to prevent truncation like "May"
          }
        });

        const wish = response.text.trim().replace(/^["'`•*-]+|["'`•*-]+$/g, '').split('\n')[0].trim();
        
        // Validation: If it's too short, it's likely a failure; try next model
        if (wish.split(' ').length > 3) {
          return res.status(200).json({
            type: 'wish',
            wish,
            wishType,
            source: 'ai',
            model: modelId,
            timestamp: new Date().toISOString()
          });
        }
      } catch (err) {
        if (err.message.includes('429')) continue;
        throw err;
      }
    }
    throw new Error("Incomplete generation");
  } catch (error) {
    const fallbacks = { day: 'Have a wonderful day!', evening: 'Enjoy a peaceful evening!', night: 'Rest well and sweet dreams!' };
    res.status(200).json({ type: 'wish', wish: fallbacks[req.body?.wishType] || 'Have a great day!', source: 'fallback' });
  }
}