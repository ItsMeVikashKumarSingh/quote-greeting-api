import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const MODEL_PRIORITY = [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemma-3-27b-it',  // Large capacity
    'gemma-3-12b-it'   // Backup
  ];

  try {
    const { wishType = 'day', history = [] } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let wish, usedModel;
    
    for (const model of MODEL_PRIORITY) {
      try {
        const response = await ai.models.generateContent({
          model,
          systemInstruction: `Wish API. ONLY one ${wishType} wish sentence. Avoid: ${history.join('; ')}.`,
          contents: [{ role: 'user', parts: [{ text: `Unique ${wishType} wish.` }] }],
          config: { temperature: 1.4, maxOutputTokens: 100 }
        });

        wish = response.text.trim().replace(/["'\n]+/g, '');
        if (wish.length >= 10 && wish.length <= 150) {
          usedModel = model;
          break;
        }
      } catch (error) {
        console.error(`Wish model ${model} failed:`, error.message);
        continue;
      }
    }

    if (!wish) throw new Error('No valid wish');

    return res.status(200).json({ type: 'wish', wish, wishType, model: usedModel });

  } catch (error) {
    console.error('Wish fallback:', error);
    res.status(200).json({ 
      type: 'wish', 
      wish: "May your day be filled with unexpected joy!", 
      source: 'fallback' 
    });
  }
}
