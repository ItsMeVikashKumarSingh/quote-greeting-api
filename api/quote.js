import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const MODEL_PRIORITY = [
    'gemma-3-27b-it',      // Your quota ✅
    'gemma-3-12b-it',      // Your quota ✅
    'gemini-2.0-flash',
    'gemini-2.5-flash-lite'
  ];

  const BAD_WORDS = ['okay', 'here', 'new', 'avoid', 'phrase'];

  try {
    const { history = [] } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let quote, author, usedModel;

    for (const model of MODEL_PRIORITY) {
      try {
        console.log(`Trying quote model: ${model}`);
        const response = await ai.models.generateContent({
          model,
          systemInstruction: `Data API. Quote + author only. No commentary.`,
          contents: [{ role: 'user', parts: [{ text: 'Inspirational quote and author' }] }],
          config: { 
            temperature: 0.7,
            maxOutputTokens: 70,
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
        if (quote.length >= 15 && quote.length <= 120 && 
            author.length >= 3 && author.length <= 40 &&
            !BAD_WORDS.some(w => lowerQuote.includes(w))) {
          usedModel = model;
          console.log(`✅ Quote success: ${model} -> "${quote}" - ${author}`);
          break;
        }
        throw new Error('Format validation failed');
      } catch (error) {
        const isQuotaError = error.message.includes('429') || error.message.includes('quota');
        console.error(`❌ Quote ${model}:`, isQuotaError ? 'QUOTA EXCEEDED - skipping' : error.message);
        if (!isQuotaError) throw error;
        continue;
      }
    }

    if (!quote || !author) throw new Error('All models quota exceeded');

    return res.status(200).json({ 
      type: 'quote', 
      quote, 
      author, 
      model: usedModel 
    });

  } catch (error) {
    console.error('Quote final fallback:', error);
    res.status(200).json({ 
      type: 'quote',
      quote: "The best way to predict the future is to invent it.",
      author: "Alan Kay",
      source: 'fallback'
    });
  }
}
