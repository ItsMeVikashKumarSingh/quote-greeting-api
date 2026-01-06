import { GoogleGenAI } from '@google/genai';

export const maxDuration = 30;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const { greetingType = 'morning' } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemma-3-4b-it', // Correct ID
      systemInstruction: "You are a Greeting API. Return ONLY the greeting string. No preamble, no conversational filler like 'Here are options'.",
      contents: [{ role: 'user', parts: [{ text: `One short ${greetingType} greeting.` }] }],
      config: { temperature: 1.0, maxOutputTokens: 100 }
    });

    return res.status(200).json({ 
      type: 'greeting', 
      greeting: response.text.trim().split('\n')[0] 
    });
  } catch (error) {
    res.status(200).json({ greeting: "Good morning!", source: 'fallback' });
  }
}