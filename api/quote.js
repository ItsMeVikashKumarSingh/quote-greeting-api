import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { history = [] } = req.body || {};

    const response = await ai.models.generateContent({
      model: 'gemma-3-27b-it', 
      systemInstruction: "You are a Quote API. Generate a UNIQUE inspirational quote. NEVER use Winston Churchill or Steve Jobs if they are in the history. Format strictly as <quote> and <author>.",
      contents: [{ 
        role: 'user', 
        parts: [{ text: `Generate a new quote. DO NOT REPEAT: [${history.join(', ')}].` }] 
      }],
      config: { 
        temperature: 1.2, 
        topK: 50,
        maxOutputTokens: 300 
      }
    });

    const text = response.text.trim();
    if (text.includes('<quote>') && text.includes('<author>')) {
      return res.status(200).send(text);
    }
    throw new Error("Bad Format");
  } catch (error) {
    res.status(200).send('<quote>"The best way to predict the future is to invent it."\n<author>Alan Kay');
  }
}