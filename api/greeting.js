import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const { greetingType = 'morning', history = [] } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Use the -it (Instruction Tuned) model for better adherence
    const response = await ai.models.generateContent({
      model: 'gemma-3-4b-it', 
      systemInstruction: "You are a direct Greeting API. Return ONLY the greeting string. No preamble, no conversational filler.",
      contents: [{ 
        role: 'user', 
        parts: [{ text: `Generate a ${greetingType} greeting. DO NOT USE ANY OF THESE: [${history.join(', ')}].` }] 
      }],
      config: { 
        temperature: 1.5, // High temperature for randomness
        topP: 0.95,
        maxOutputTokens: 60 
      }
    });

    const greeting = response.text.trim().split('\n')[0];
    return res.status(200).json({ type: 'greeting', greeting, model: 'gemma-3-4b-it' });
  } catch (error) {
    console.error(error);
    res.status(200).json({ greeting: "Rise and shine! Have a great day.", source: 'fallback' });
  }
}