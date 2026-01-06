import { GoogleGenAI } from '@google/genai';

export const maxDuration = 30;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const { greetingType = 'morning' } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const model = ai.models.getGenerativeModel({
      model: 'gemma-3-4b-it', // Fastest high-limit model
      systemInstruction: "You are a Greeting API. Return ONLY the greeting string. No preamble or conversational filler."
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `Short ${greetingType} greeting.` }] }],
      config: { temperature: 1.0, maxOutputTokens: 50 }
    });

    return res.status(200).json({ 
      type: 'greeting', 
      greeting: result.response.text().trim().split('\n')[0] 
    });
  } catch (error) {
    res.status(200).json({ greeting: "Good morning!", source: 'fallback' });
  }
}