import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const MODEL_PRIORITY = [
    'gemini-2.5-flash',    // Unlimited quota
    'gemini-2.5-pro',      // High quality
    'gemma-3-27b-it',      // Your large model (131K)
    'gemma-3-12b-it'       // Reliable fallback (32K)
  ];

  try {
    const { greetingType = 'morning', history = [] } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let greeting, usedModel;
    let lastError;

    for (const model of MODEL_PRIORITY) {
      try {
        const response = await ai.models.generateContent({
          model,
          systemInstruction: `Greeting API. Return ONLY one ${greetingType} greeting. No lists. No colons. Avoid: ${history.join('; ')}.`,
          contents: [{ role: 'user', parts: [{ text: `New ${greetingType} greeting.` }] }],
          config: { temperature: 1.5, topP: 0.95, maxOutputTokens: 60 }
        });

        greeting = response.text.trim().split('\n')[0].split('.')[0];
        
        if (greeting.length >= 8 && !greeting.includes(':') && !greeting.includes('here')) {
          usedModel = model;
          break;  // Success!
        }
        throw new Error('Format validation failed');
      } catch (error) {
        lastError = error.message;
        console.error(`Model ${model} failed:`, error.message);
        continue;  // Try next model
      }
    }

    if (!greeting) {
      throw new Error(`All models failed. Last error: ${lastError}`);
    }

    return res.status(200).json({ 
      type: 'greeting', 
      greeting, 
      greetingType,
      model: usedModel 
    });

  } catch (error) {
    console.error('Greeting fallback:', error);
    res.status(200).json({ 
      type: 'greeting', 
      greeting: "Rise and shine! Have a great day.",
      greetingType: 'morning',
      source: 'fallback',
      error: error.message 
    });
  }
}
