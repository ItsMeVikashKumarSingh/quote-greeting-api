import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const MODEL_PRIORITY = [
    'gemma-3-27b-it',       // Text mode only
    'gemma-3-12b-it',       // Text mode only
    'gemini-2.0-flash',     // JSON mode ✅
    'gemini-2.5-flash-lite' // JSON mode ✅
  ];

  const BAD_WORDS = ['okay', 'here', 'new'];

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let quote = null;
    let author = null;
    let usedModel = null;

    for (const model of MODEL_PRIORITY) {
      try {
        console.log(`Trying quote model: ${model}`);
        const isGeminiModel = model.startsWith('gemini');

        const config = {
          temperature: 0.7,
          maxOutputTokens: 80
        };

        if (isGeminiModel) {
          config.responseMimeType = 'application/json';
          config.responseSchema = {
            type: 'object',
            properties: {
              quote: { type: 'string' },
              author: { type: 'string' }
            },
            required: ['quote', 'author']
          };
        }

        const response = await ai.models.generateContent({
          model,
          systemInstruction: `Data API. Quote then author. No commentary.`,
          contents: [
            { role: 'user', parts: [{ text: 'Inspirational quote + author' }] }
          ],
          config
        });

        let rawQuote;
        let rawAuthor;

        if (isGeminiModel) {
          const parsed = JSON.parse(response.text);
          rawQuote = (parsed.quote || '').trim().replace(/^["' ]+|["' ]+$/g, '');
          rawAuthor = (parsed.author || '').trim();
        } else {
          const lines = response.text
            .trim()
            .split('\n')
            .map(l => l.trim())
            .filter(Boolean);
          rawQuote = (lines[0] || '').replace(/^["' ]+|["' ]+$/g, '');
          rawAuthor = lines[1] || '';
        }

        const lowerQuote = rawQuote.toLowerCase();
        if (
          rawQuote.length >= 15 &&
          rawAuthor.length >= 3 &&
          !BAD_WORDS.some(w => lowerQuote.includes(w))
        ) {
          quote = rawQuote;
          author = rawAuthor;
          usedModel = model;
          console.log(`✅ Quote success: ${model}`);
          break;
        } else {
          throw new Error(`Validation failed: "${rawQuote}" / "${rawAuthor}"`);
        }
      } catch (error) {
        const msg = String(error.message || error);
        const isQuotaError = msg.includes('429') || msg.toLowerCase().includes('quota');
        const isJsonError = msg.includes('JSON mode');

        console.error(
          `❌ Quote ${model}:`,
          isQuotaError ? 'QUOTA - skip'
          : isJsonError ? 'JSON UNSUPPORTED - skip'
          : msg
        );
        continue;
      }
    }

    if (!quote || !author) {
      throw new Error('All models failed');
    }

    return res.status(200).json({
      type: 'quote',
      quote,
      author,
      model: usedModel
    });
  } catch (error) {
    console.error('Quote fallback:', error);
    return res.status(200).json({
      type: 'quote',
      quote: "Believe you can and you're halfway there.",
      author: 'Theodore Roosevelt',
      source: 'fallback'
    });
  }
}
