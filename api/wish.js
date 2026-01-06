import { GoogleGenAI } from '@google/genai';

export const maxDuration = 30;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const { wishType = 'day', history = [] } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemma-3-12b-it', // Correct ID
      systemInstruction: `Generate a beautiful ${wishType} wish. Avoid: [${history.join(', ')}]. Return only the wish string.`,
      contents: [{ role: 'user', parts: [{ text: "Write the wish." }] }],
      config: { temperature: 1.0, maxOutputTokens: 200 }
    });

    return res.status(200).json({ 
      type: 'wish', 
      wish: response.text.trim().replace(/["]+/g, ''),
      wishType
    });
  } catch (error) {
    res.status(200).json({ wish: "Have an amazing day!", source: 'fallback' });
  }
}