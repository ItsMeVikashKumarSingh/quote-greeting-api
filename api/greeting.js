import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const MODEL_PRIORITY = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemma-3-27b-it', 'gemma-3-12b-it'];
  const BAD_WORDS = ['okay', 'here', 'let', 'craft', 'bunch', 'few'];

  try {
    const { greetingType = 'morning', history = [] } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let greeting, usedModel;

    for (const model of MODEL_PRIORITY) {
      try {
        const response = await ai.models.generateContent({
          model,
          systemInstruction: `You are not conversational. Data API only. Generate one ${greetingType} greeting sentence. No explanations.`,
          contents: [{ role: 'user', parts: [{ text: `Single ${greetingType} greeting${history.length ? `. Avoid: ${history.slice(0,2).join(', ')}` : ''}` }] }],
          config: { 
            temperature: 0.6,
            maxOutputTokens: 30,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: { text: { type: 'string' } },
              required: ['text']
            }
          }
        });

        const parsed = JSON.parse(response.text);
        greeting = parsed.text.trim().replace(/[.!?]+$/, '');

        // Validate
        const lowerGreeting = greeting.toLowerCase();
        if (greeting.length >= 8 && greeting.length <= 60 && 
            !BAD_WORDS.some(w => lowerGreeting.includes(w)) &&
            greeting.split(' ').length <= 10) {
          usedModel = model;
          break;
        }
        throw new Error('Invalid format');
      } catch (error) {
        console.error(`Greeting ${model}:`, error.message);
        continue;
      }
    }

    if (!greeting) throw new Error('All models failed');

    return res.status(200).json({ type: 'greeting', greeting, greetingType, model: usedModel });

  } catch (error) {
    console.error('Greeting fallback:', error);
    res.status(200).json({ type: 'greeting', greeting: "Good morning sunshine", greetingType: 'morning', source: 'fallback' });
  }
}
