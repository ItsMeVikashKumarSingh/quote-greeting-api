import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const MODEL_PRIORITY = [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemma-3-27b-it',
    'gemma-3-12b-it'
  ];

  const BAD_PATTERNS = ['here', 'okay', 'new', 'inspirational', 'hope'];

  try {
    const { history = [] } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let quote, author, usedModel;

    for (const model of MODEL_PRIORITY) {
      try {
        const response = await ai.models.generateContent({
          model,
          systemInstruction: `QUOTE API. EXACT FORMAT:
  "Quote text exactly like this"
  Author Name
  
  NO intro. NO explain. NO emojis. NO formatting.`,
          contents: [{ role: 'user', parts: [{ text: `Quote. Avoid: ${history.slice(0,3).join(';')}` }] }],
          config: { temperature: 0.8, topK: 40, maxOutputTokens: 80 }
        });

        const lines = response.text.trim().split('\n').map(l => l.trim()).filter(Boolean);
        quote = lines[0]?.replace(/^["'"]+|["'"]+$/g, '');
        author = lines[1];

        if (quote && author && quote.length >= 15 && quote.length <= 100 && 
            !BAD_PATTERNS.some(p => quote.toLowerCase().includes(p))) {
          usedModel = model;
          break;
        }
        throw new Error(`Quote failed: "${quote}"`);
      } catch (error) {
        console.error(`Quote ${model}:`, error.message);
        continue;
      }
    }

    if (!quote || !author) throw new Error('No valid quote');

    return res.status(200).json({ 
      type: 'quote', 
      quote, 
      author, 
      model: usedModel 
    });

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
