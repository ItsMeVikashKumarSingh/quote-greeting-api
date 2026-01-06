import { GoogleGenAI } from '@google/genai';

export const maxDuration = 30;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { history = [] } = req.body || {};

    const response = await ai.models.generateContent({
      model: 'gemma-3-27b-it', // Correct ID from models.js
      systemInstruction: `You are a Quote API. Generate ONE UNIQUE inspirational quote. 
      NEVER repeat these: [${history.join(', ')}]. 
      Format strictly as: <quote>"TEXT"\\n<author>NAME. No extra text.`,
      contents: [{ role: 'user', parts: [{ text: "Generate a new quote." }] }],
      config: { temperature: 1.0, maxOutputTokens: 400 }
    });

    const text = response.text.trim();
    if (text.includes('<quote>') && text.includes('<author>')) {
      return res.status(200).send(text);
    }
    throw new Error("Format Incomplete");
  } catch (error) {
    res.status(200).send('<quote>"Success is not final, failure is not fatal."\n<author>Winston Churchill');
  }
}