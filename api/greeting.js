import { GoogleGenAI } from '@google/genai';

export const maxDuration = 30; 

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const { greetingType = 'morning' } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const model = ai.models.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      systemInstruction: "You are a direct Greeting API. Return ONLY the final greeting string. No preamble, no conversational filler, no 'Here are options'."
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `One short ${greetingType} greeting.` }] }],
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