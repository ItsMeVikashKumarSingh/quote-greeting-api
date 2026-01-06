import { GoogleGenAI } from '@google/genai';

export const maxDuration = 30;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');

  try {
    const { history = [] } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // Switch to Gemma 3 27B for 14.4K RPD
    const model = ai.models.getGenerativeModel({ 
      model: 'gemma-3-27b-it',
      systemInstruction: `Generate ONE UNIQUE inspirational quote. 
      NEVER repeat these: [${history.join(', ')}]. 
      Format strictly as: <quote>"TEXT"\\n<author>NAME. No other text.`
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: "New quote." }] }],
      config: { temperature: 1.0, maxOutputTokens: 300 }
    });

    const text = result.response.text().trim();
    if (text.includes('<quote>') && text.includes('<author>')) {
      return res.status(200).send(text);
    }
    throw new Error("Invalid Format");
  } catch (error) {
    res.status(200).send('<quote>"Success is ."\n<author>Winston Churchill');
  }
}