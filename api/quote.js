import { GoogleGenAI } from '@google/genai';

export const maxDuration = 30; // Prevents 10s timeout

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { history = [] } = req.body || {};

    // GEMMA 3 27B has 14,400 RPD
    const response = await ai.models.generateContent({
      model: 'gemma-3-27b', 
      contents: [{ 
        role: 'user', 
        parts: [{ text: `Generate ONE UNIQUE inspirational quote. 
        DO NOT REPEAT: [${history.join(', ')}]. 
        Format: <quote>"TEXT"\\n<author>NAME. Return ONLY this format.` }] 
      }],
      config: { temperature: 1.0, maxOutputTokens: 300 } // Enough tokens to finish the author
    });

    const text = response.text.trim();
    if (text.includes('<quote>') && text.includes('<author>') && text.length > 20) {
      return res.status(200).send(text);
    }
    throw new Error("Invalid Format");
  } catch (error) {
    res.status(200).send('<quote>"Success is not final, failure is not fatal."\n<author>Winston Churchill');
  }
}