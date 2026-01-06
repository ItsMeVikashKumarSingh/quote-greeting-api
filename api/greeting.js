import { GoogleGenAI } from '@google/genai';

const MODELS = ['gemini-3-flash-preview', 'gemini-2.5-flash-lite'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const { greetingType = 'morning', history = [] } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const historyText = history.length ? `\nAvoid: ${history.join(', ')}` : '';

    for (const modelId of MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelId,
          contents: [{ role: 'user', parts: [{ text: `Write a COMPLETE ${greetingType} greeting. ${historyText}` }] }],
          config: { 
            temperature: 1.2, 
            maxOutputTokens: 100 // Headroom for full greetings
          }
        });

        const greeting = response.text.trim().replace(/^["'`]|["'`]$/g, '').split('\n')[0];
        
        // If it's a broken phrase like "Rise and", it will fail this check and try the next model
        if (greeting.split(' ').length >= 2) {
          return res.status(200).json({ type: 'greeting', greeting, modelUsed: modelId });
        }
      } catch (err) {
        if (err.message.includes('429')) continue;
        throw err;
      }
    }
    throw new Error("Retrying");
  } catch (error) {
    res.status(200).json({ greeting: "Good morning!", modelUsed: 'fallback' });
  }
}