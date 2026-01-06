import { GoogleGenAI } from '@google/genai';

export const maxDuration = 30; // Prevents Vercel from killing the task prematurely

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const { greetingType = 'morning' } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Use Flash-Lite for sub-3-second responses
    const model = ai.models.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      systemInstruction: "You are a direct Greeting API. Return ONLY the greeting text. No preamble, no conversational filler like 'Here are options', and no quotes."
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `Generate ONE short ${greetingType} greeting.` }] }],
      config: { temperature: 1.0, maxOutputTokens: 100 } // Enough headroom to finish the phrase
    });

    return res.status(200).json({ 
      greeting: result.response.text().trim().split('\n')[0], 
      model: 'gemini-2.5-flash-lite' 
    });
  } catch (error) {
    res.status(200).json({ greeting: "Good morning!", source: 'fallback' });
  }
}