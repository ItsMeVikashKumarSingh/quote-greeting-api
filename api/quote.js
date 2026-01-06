import { GoogleGenAI } from '@google/genai';

export const maxDuration = 30; // Prevents Vercel 10s timeout

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const ai = new GoogleGenAI({ apiKey });
    const { history = [] } = req.body || (req.query.history ? { history: JSON.parse(req.query.history) } : {});

    const model = ai.models.getGenerativeModel({ 
      model: 'gemma-3-27b-it', // High limit: 14.4K RPD
      systemInstruction: `You are a Quote API. Generate ONE UNIQUE inspirational quote. 
      CRITICAL: Never repeat these: [${history.join(', ')}]. 
      Format: <quote>"TEXT"\\n<author>NAME. No filler.`
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: "Generate a new quote." }] }],
      config: { temperature: 1.0, maxOutputTokens: 300 }
    });

    return res.status(200).send(result.response.text().trim());
  } catch (error) {
    res.status(200).send('<quote>"Success is not final, failure is not fatal."\n<author>Winston Churchill');
  }
}