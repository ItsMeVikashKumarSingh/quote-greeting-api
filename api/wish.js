import { GoogleGenAI } from '@google/genai';

export const maxDuration = 30;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const { wishType = 'day', history = [] } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const model = ai.models.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      systemInstruction: `Generate a beautiful ${wishType} wish. Avoid these: [${history.join(', ')}]. Return only the wish string.`
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: "Write the wish." }] }],
      config: { temperature: 1.0, maxOutputTokens: 200 }
    });

    return res.status(200).json({ 
      type: 'wish', 
      wish: result.response.text().trim().replace(/["]+/g, ''),
      wishType
    });
  } catch (error) {
    res.status(200).json({ wish: "Have a wonderful day!", source: 'fallback' });
  }
}