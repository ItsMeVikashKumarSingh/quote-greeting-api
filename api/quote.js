import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const MODEL_PRIORITY = [
    'gemma-3-27b-it',
    'gemma-3-12b-it', 
    'gemini-2.0-flash',
    'gemini-2.5-flash-lite'
  ];

  const BAD_WORDS = ['okay', 'here', 'new'];

  try {
    const { history = [] } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let quote, author, usedModel;

    for (const model of MODEL_PRIORITY) {
      try {
        console.log(`Trying quote model: ${model}`);
        
        const isGeminiModel = model.startsWith('gemini');
        const config = { temperature: 0.7, maxOutputTokens: 80 };
        
        if (isGeminiModel) {
          config.responseMimeType = 'application/json';
          config.responseSchema = { 
            type: 'object', 
            properties: { quote: {type:'string'}, author: {type:'string'} }, 
            required: ['quote', 'author'] 
          };
        }

        const response = await ai.models.generateContent({
          model,
          systemInstruction: `Data API. Quote then author. No commentary.`,
          contents: [{ role: 'user', parts: [{ text: 'Inspirational quote + author' }] }],
          config
        });

        if (isGeminiModel) {
          const parsed = JSON.parse(response.text);
          quote = parsed.quote.trim().replace(/^["']+|["']+$/g, '');
          author = parsed.author.trim();
        } else {
          // Gemma parsing
          const lines = response.text.trim().split('\n').map(l => l.trim()).filter(Boolean);
          quote = lines[0]?.replace(/^["']+|["']+$/g, '') || '';
          author = lines[1] || '';
        }

        const lowerQuote = quote.toLowerCase();
        if (quote.length >= 15 && author.length >= 3 && 
            !BAD_WORDS.some(w => lowerQuote.includes(w))) {
          usedModel = model;
          console.log(`✅ Quote success: ${model}`);
          break;
        }
        throw new Error('Validation failed');
      } catch (error) {
        const isQuotaError = error.message.includes('429') || error.message.includes('quota');
        const isJsonError = error.message.includes('JSON mode');
        console.error(`❌ Quote ${model}:`, 
          isQuotaError ? 'QUOTA - skip' : 
          isJsonError ? 'JSON UNSUPPORTED - skip' : 
          error.message);
        continue;
      }
    }

    if (!quote || !author) throw new Error('All models failed');

    return res.status(200).json({ type: 'quote', quote, author, model: usedModel });

  } catch (error) {
    console.error('Quote fallback:', error);
    res.status(200).json({ 
      type: 'quote',
      quote: "Believe you can and you're halfway there.",
      author: "Theodore Roosevelt",
      source: 'fallback'
    });
  }
}
