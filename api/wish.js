import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  // GEMMA FIRST - your available quota
  const MODEL_PRIORITY = [
    'gemma-3-27b-it',      // 131K TPM ✅
    'gemma-3-12b-it',      // 32K TPM ✅
    'gemini-2.0-flash',    // Lower usage
    'gemini-2.5-flash-lite' // Separate quota
  ];

  const BAD_WORDS = ['okay', 'here', 'few', 'tone', 'option', 'craft'];

  try {
    const { wishType = 'day', history = [] } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let wish, usedModel;

    for (const model of MODEL_PRIORITY) {
      try {
        console.log(`Trying wish model: ${model}`);
        const response = await ai.models.generateContent({
          model,
          systemInstruction: `Data API. No conversation. Single ${wishType} wish sentence only.`,
          contents: [{ role: 'user', parts: [{ text: `${wishType.charAt(0).toUpperCase() + wishType.slice(1)} wish` }] }],
          config: { 
            temperature: 0.8,
            maxOutputTokens: 40,
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
        if (!wish.match(/[.!?]$/)) wish += '.';

        const lowerWish = wish.toLowerCase();
        if (wish.length >= 12 && wish.length <= 80 && 
            !BAD_WORDS.some(w => lowerWish.includes(w)) &&
            wish.split(' ').length <= 15) {
          usedModel = model;
          console.log(`✅ Wish success: ${model} -> "${wish}"`);
          break;
        }
        throw new Error('Format validation failed');
      } catch (error) {
        const isQuotaError = error.message.includes('429') || error.message.includes('quota');
        console.error(`❌ Wish ${model}:`, isQuotaError ? 'QUOTA EXCEEDED - skipping' : error.message);
        if (!isQuotaError) throw error;
        continue;  // Skip quota errors only
      }
    }

    if (!wish) throw new Error('All models quota exceeded');

    return res.status(200).json({ 
      type: 'wish', 
      wish, 
      wishType, 
      model: usedModel 
    });

  } catch (error) {
    console.error('Wish final fallback:', error);
    res.status(200).json({ 
      type: 'wish', 
      wish: `Wishing you a beautiful ${wishType}.`, 
      wishType, 
      source: 'fallback' 
    });
  }
}
