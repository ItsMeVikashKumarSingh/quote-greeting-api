import { GoogleGenAI } from '@google/genai';

export const maxDuration = 30;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');

  try {
    const { history = [] } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const model = ai.models.getGenerativeModel({ 
      model: 'gemini-2.5-flash-lite',
      systemInstruction: `You are a creative Quote API. You MUST generate a NEW inspirational quote. 
      CRITICAL: NEVER repeat these previous quotes: [${history.join(', ')}]. 
      Format: <quote>"TEXT"\\n<author>NAME. Return ONLY this format.`
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: "Generate a fresh quote." }] }],
      config: { temperature: 1.2, maxOutputTokens: 300 } // Prevents cutting off mid-quote
    });

    const text = result.response.text().trim();
    if (text.includes('<quote>') && text.includes('<author>')) {
      return res.status(200).send(text);
    }
    throw new Error("Bad Format");
  } catch (error) {
    res.status(200).send('<quote>"Success is not final, failure is not fatal."\n<author>Winston Churchill');
  }
}