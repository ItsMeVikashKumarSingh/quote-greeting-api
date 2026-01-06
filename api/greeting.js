import { GoogleGenAI } from '@google/genai';

const MODELS = ['gemini-3-flash-preview', 'gemini-2.5-flash-lite'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const { greetingType = 'morning', history = [] } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    for (const modelId of MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelId,
          // SYSTEM INSTRUCTION: Use this to define "No Filler" rules
          systemInstruction: "You are a direct greeting API. Return ONLY the greeting text. No conversational preamble, no 'Here are options', no quotes.",
          contents: [{ role: 'user', parts: [{ text: `Generate a complete ${greetingType} greeting.` }] }],
          config: { 
            temperature: 1.0, 
            maxOutputTokens: 100 // Increased from 25 to prevent "Rise and" truncation
          }
        });

        const greeting = response.text.trim().split('\n')[0];
        // Validation: Ensure it didn't return a "Here are options" filler
        if (greeting.length > 3 && !greeting.toLowerCase().includes('here are')) {
          return res.status(200).json({ type: 'greeting', greeting, model: modelId });
        }
      } catch (err) {
        if (err.message.includes('429')) continue;
        throw err;
      }
    }
  } catch (error) {
    res.status(200).json({ greeting: "Good morning!", source: 'fallback' });
  }
}