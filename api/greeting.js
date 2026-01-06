import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  // QUOTA-SAFE PRIORITY (Gemma first - your available quota)
  const MODEL_PRIORITY = [
    'gemma-3-27b-it',     // 131K available ✅
    'gemma-3-12b-it',     // 32K available ✅
    'gemini-2.0-flash',   // Lower usage
    'gemini-2.5-flash-lite'  // Separate quota
  ];

  const BAD_WORDS = ['okay', 'here', 'let', 'craft'];

  try {
    const { greetingType = 'morning', history = [] } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let greeting, usedModel;

    for (const model of MODEL_PRIORITY) {
      try {
        console.log(`Trying greeting model: ${model}`);
        const response = await ai.models.generateContent({
          model,
          systemInstruction: `Data API. No conversation. Single ${greetingType} greeting.`,
          contents: [{ role: 'user', parts: [{ text: `${greetingType} greeting` }] }],
          config: { 
            temperature: 0.6,
            maxOutputTokens: 25,
            responseMimeType: 'application/json',
            responseSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] }
          }
        });

        const parsed = JSON.parse(response.text);
        greeting = parsed.text.trim();

        if (greeting.length >= 8 && greeting.length <= 40 && 
            !BAD_WORDS.some(w => greeting.toLowerCase().includes(w))) {
          usedModel = model;
          console.log(`✅ Greeting success: ${model}`);
          break;
        }
      } catch (error) {
        console.error(`❌ Greeting ${model}:`, error.message.includes('quota') ? 'QUOTA EXCEEDED' : error.message);
        if (error.message.includes('429') || error.message.includes('quota')) continue;
        throw error;  // Non-quota error = fatal
      }
    }

    return res.status(200).json({ 
      type: 'greeting', 
      greeting: greeting || 'Good morning beautiful day', 
      greetingType, 
      model: usedModel || 'fallback' 
    });

  } catch (error) {
    console.error('Greeting final error:', error);
    res.status(200).json({ type: 'greeting', greeting: 'Good morning sunshine', greetingType: 'morning', source: 'fallback' });
  }
}
