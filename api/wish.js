import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const MODEL_PRIORITY = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemma-3-27b-it', 'gemma-3-12b-it'];
  const BAD_WORDS = ['okay', 'here', 'few', 'tone', 'option'];

  try {
    const { wishType = 'day', history = [] } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let wish, usedModel;

    for (const model of MODEL_PRIORITY) {
      try {
        const response = await ai.models.generateContent({
          model,
          systemInstruction: `You are not conversational. Generate one ${wishType} wish sentence. No lists.`,
          contents: [{ role: 'user', parts: [{ text: `${wishType} wish${history.length ? `. Avoid: ${history.slice(0,2).join(', ')}` : ''}` }] }],
          config: { 
            temperature: 0.9,
            maxOutputTokens: 50,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: { text: { type: 'string' } },
              required: ['text']
            }
          }
        });

        const parsed = JSON.parse(response.text);
        wish = parsed.text.trim();
        if (!wish.endsWith('.') && !wish.endsWith('!')) wish += '.';

        const lowerWish = wish.toLowerCase();
        if (wish.length >= 15 && wish.length <= 100 && 
            !BAD_WORDS.some(w => lowerWish.includes(w))) {
          usedModel = model;
          break;
        }
        throw new Error('Invalid format');
      } catch (error) {
        console.error(`Wish ${model}:`, error.message);
        continue;
      }
    }

    if (!wish) throw new Error('No valid wish');

    return res.status(200).json({ type: 'wish', wish, wishType, model: usedModel });

  } catch (error) {
    console.error('Wish fallback:', error);
    res.status(200).json({ 
      type: 'wish', 
      wish: "Wishing you a peaceful evening filled with warmth.",
      wishType,
      source: 'fallback' 
    });
  }
}
