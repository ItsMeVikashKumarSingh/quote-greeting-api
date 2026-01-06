import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const { greetingType = 'morning', history = [] } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemma-3-4b-it',
      systemInstruction: `Greeting API. Return ONLY one ${greetingType} greeting sentence. 
      No lists. No colons. No "here are". No explanations. Avoid history completely.`,
      contents: [{ 
        role: 'user', 
        parts: [{ text: `New ${greetingType} greeting. Avoid: ${history.join('; ')}.` }] 
      }],
      config: { 
        temperature: 1.5,
        topP: 0.95,
        maxOutputTokens: 60 
      }
    });

    let greeting = response.text.trim().split('\n')[0].split('.')[0];
    
    // Strict validation
    if (greeting.includes(':') || greeting.includes('here') || greeting.length < 8) {
      throw new Error('Invalid greeting format');
    }
    
    return res.status(200).json({ 
      type: 'greeting', 
      greeting, 
      greetingType,
      model: 'gemma-3-4b-it' 
    });
  } catch (error) {
    res.status(200).json({ 
      type: 'greeting', 
      greeting: "Rise and shine! Have a great day.",
      greetingType: 'morning',
      source: 'fallback' 
    });
  }
}
