import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const MODEL_PRIORITY = [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemma-3-27b-it',
    'gemma-3-12b-it'
  ];

  const BAD_PATTERNS = ['here are', 'let', 'okay', 'craft', 'options', 'ranging'];

  try {
    const { wishType = 'day', history = [] } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let wish, usedModel;

    for (const model of MODEL_PRIORITY) {
      try {
        const response = await ai.models.generateContent({
          model,
          systemInstruction: `WISH API. ONE ${wishType.toUpperCase()} wish sentence. 10-25 words. 
          End with period. NO lists. NO "here". NO explain. NO categories.`,
          contents: [{ role: 'user', parts: [{ text: `${wishType} wish. Avoid: ${history.slice(0,3).join(';')}` }] }],
          config: { temperature: 0.9, maxOutputTokens: 60 }
        });

        wish = response.text.trim()
          .replace(/["'\n]+/g, '')
          .split('.')[0] + '.';

        if (wish.length >= 15 && wish.length <= 120 && 
            wish.split('.').length === 1 &&
            !BAD_PATTERNS.some(p => wish.toLowerCase().includes(p))) {
          usedModel = model;
          break;
        }
        throw new Error(`Wish failed: "${wish}"`);
      } catch (error) {
        console.error(`Wish ${model}:`, error.message);
        continue;
      }
    }

    if (!wish) throw new Error('No valid wish');

    return res.status(200).json({ 
      type: 'wish', 
      wish, 
      wishType, 
      model: usedModel 
    });

  } catch (error) {
    console.error('Wish fallback:', error);
    res.status(200).json({ 
      type: 'wish', 
      wish: "Wishing you a day filled with unexpected joy and peace.",
      wishType,
      source: 'fallback' 
    });
  }
}
