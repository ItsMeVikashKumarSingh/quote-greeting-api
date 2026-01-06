import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const MODEL_PRIORITY = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemma-3-27b-it', 'gemma-3-12b-it'];
  const BAD_WORDS = ['okay', 'here', 'new', 'avoid', 'phrase'];

  try {
    const { history = [] } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let quote, author, usedModel;

    for (const model of MODEL_PRIORITY) {
      try {
        const response = await ai.models.generateContent({
          model,
          systemInstruction: `You are not conversational. Generate inspirational quote with author. No commentary.`,
          contents: [{ role: 'user', parts: [{ text: `Quote and author${history.length ? `. Avoid: ${history.slice(0,2).join(', ')}` : ''}` }] }],
          config: { 
            temperature: 0.8,
            maxOutputTokens: 80,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                quote: { type: 'string' },
                author: { type: 'string' }
              },
              required: ['quote', 'author']
            }
          }
        });

        const parsed = JSON.parse(response.text);
        quote = parsed.quote.trim().replace(/^["']+|["']+$/g, '');
        author = parsed.author.trim();

        const lowerQuote = quote.toLowerCase();
        if (quote.length >= 15 && quote.length <= 150 && 
            author.length >= 3 && author.length <= 50 &&
            !BAD_WORDS.some(w => lowerQuote.includes(w))) {
          usedModel = model;
          break;
        }
        throw new Error('Invalid format');
      } catch (error) {
        console.error(`Quote ${model}:`, error.message);
        continue;
      }
    }

    if (!quote || !author) throw new Error('No valid quote');

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
