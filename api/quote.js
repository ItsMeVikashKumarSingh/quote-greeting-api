import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const MODEL_PRIORITY = [
    'gemini-2.5-flash',
    'gemini-2.5-pro', 
    'gemma-3-27b-it',   // Your preferred large model
    'gemma-3-12b-it'
  ];

  try {
    const { history = [] } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let quote, author, usedModel;
    
    for (const model of MODEL_PRIORITY) {
      try {
        const response = await ai.models.generateContent({
          model,
          systemInstruction: `Quote API. Return ONE quote + author on new line. Avoid history: ${history.join('; ')}. No explanations.`,
          contents: [{ role: 'user', parts: [{ text: 'New inspirational quote.' }] }],
          config: { temperature: 1.2, topK: 50, maxOutputTokens: 300 }
        });

        const lines = response.text.trim().split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length >= 2) {
          quote = lines[0].replace(/^["']|["']$/g, '');
          author = lines.slice(1).join(' ');
          usedModel = model;
          break;
        }
      } catch (error) {
        console.error(`Quote model ${model} failed:`, error.message);
        continue;
      }
    }

    if (!quote) throw new Error('No valid quote generated');

    return res.status(200).json({ type: 'quote', quote, author, model: usedModel });

  } catch (error) {
    console.error('Quote fallback:', error);
    res.status(200).json({ 
      type: 'quote',
      quote: "The best way to predict the future is to invent it.",
      author: "Alan Kay",
      source: 'fallback'
    });
  }
}
