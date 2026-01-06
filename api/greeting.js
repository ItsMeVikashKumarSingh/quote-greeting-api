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

  const BAD_PATTERNS = ['here are', 'let', 'okay', 'craft', 'bunch', 'options', 'ranging', 'tone'];

  try {
    const { greetingType = 'morning', history = [] } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let greeting, usedModel;

    for (const model of MODEL_PRIORITY) {
      try {
        const response = await ai.models.generateContent({
          model,
          systemInstruction: `GREETING API. 5 WORDS MAX. ONLY: [${greetingType} greeting]. 
          NO intro. NO lists. NO "here". NO "let". NO explain. NO punctuation after greeting.`,
          contents: [{ role: 'user', parts: [{ text: `${greetingType} greeting. ${history.length ? `Avoid: ${history.slice(0,3).join(';')}` : ''}` }] }],
          config: { temperature: 0.7, topP: 0.9, maxOutputTokens: 20 }
        });

        // Bulletproof parsing
        greeting = response.text.trim()
          .replace(/[.!?;,:\[\]"']/g, '')  // Strip all
          .split('\n')[0]
          .split(' ')
          .slice(0, 8)
          .join(' ');

        // Strict validation
        if (greeting.length >= 8 && greeting.length <= 50 && 
            !BAD_PATTERNS.some(p => greeting.toLowerCase().includes(p))) {
          usedModel = model;
          break;
        }
        throw new Error(`Format failed: "${greeting}"`);
      } catch (error) {
        console.error(`Greeting ${model}:`, error.message);
        continue;
      }
    }

    if (!greeting) throw new Error('All models failed validation');

    return res.status(200).json({ 
      type: 'greeting', 
      greeting, 
      greetingType, 
      model: usedModel 
    });

  } catch (error) {
    console.error('Greeting final fallback:', error);
    res.status(200).json({ 
      type: 'greeting', 
      greeting: "Good morning sunshine!", 
      greetingType, 
      source: 'fallback' 
    });
  }
}
