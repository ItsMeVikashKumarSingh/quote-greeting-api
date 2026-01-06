import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const { greetingType = 'morning' } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Gemma 3 4B is ultra-fast to beat the 10s timeout
    const response = await ai.models.generateContent({
      model: 'gemma-3-4b',
      contents: [{ 
        role: 'user', 
        parts: [{ text: `Return ONLY one short ${greetingType} greeting. No preamble, no options, no conversational filler.` }] 
      }],
      config: { temperature: 1.0, maxOutputTokens: 50 }
    });

    const greeting = response.text.trim().split('\n')[0];
    if (greeting.length > 3 && !greeting.includes('Here are')) {
      return res.status(200).json({ type: 'greeting', greeting, model: 'gemma-3-4b' });
    }
    throw new Error("Bad Response");
  } catch (error) {
    res.status(200).json({ greeting: "Good morning!", source: 'fallback' });
  }
}