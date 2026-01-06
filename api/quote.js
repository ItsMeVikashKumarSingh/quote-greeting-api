import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const MODEL_PRIORITY = [
    'gemma-3-27b-it',       // text only
    'gemma-3-12b-it',       // text only
    'gemini-2.0-flash',     // JSON
    'gemini-2.5-flash-lite' // JSON
  ];

  // Words/phrases we never want in the quote
  const BAD_WORDS = ['okay', 'here', 'new', "here's an inspirational quote"];

  // Hard fallback if everything fails (clean, no markdown)
  const CLEAN_FALLBACK = {
    quote: 'The future belongs to those who believe in the beauty of their dreams.',
    author: 'Eleanor Roosevelt'
  };

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
          temperature: 0.4,  // lower temp for more deterministic output
          maxOutputTokens: 80
        };

        if (isGeminiModel) {
          // STRICT schema: exactly { quote: string, author: string }
          config.responseMimeType = 'application/json';
          config.responseSchema = {
            type: 'object',
            properties: {
              quote: { type: 'string' },
              author: { type: 'string' }
            },
            required: ['quote', 'author'],
            additionalProperties: false
          };
        }

        const systemInstruction = isGeminiModel
          ? [
              'You are a quote data API.',
              'Return ONLY a JSON object matching the schema.',
              'Fields:',
              '- quote: a single inspirational quote sentence, no surrounding quotation marks, no markdown.',
              '- author: only the plain author name, no markdown, no quote repeated.',
              'Do NOT include any explanation, intro text, or formatting like ** or ```.'
            ].join(' ')
          : 'Data API. First line: quote only. Second line: author only. No intro, no commentary, no markdown.';

        const response = await ai.models.generateContent({
          model,
          systemInstruction,
          contents: [
            {
              role: 'user',
              parts: [{ text: 'Return an inspirational quote and its author.' }]
            }
          ],
          config
        });

        let rawQuote;
        let rawAuthor;

        if (isGeminiModel) {
          // JSON from Gemini; response.text must be a JSON string
          const parsed = JSON.parse(response.text);

          rawQuote = (parsed.quote || '').trim();
          rawAuthor = (parsed.author || '').trim();
        } else {
          // Plain text from Gemma: line 1 = quote, line 2 = author
          const lines = response.text
            .trim()
            .split('\n')
            .map(l => l.trim())
            .filter(Boolean);

          rawQuote = (lines || '').trim();
          rawAuthor = (lines[1] || '').trim();
        }

        // 1) Strip quotes and markdown-style formatting
        const cleanMarkdown = (s) =>
          (s || '')
            .replace(/^["'\s]+|["'\s]+$/g, '')   // outer quotes/spaces
            .replace(/\*\*/g, '')               // remove bold markers
            .replace(/`/g, '')                  // backticks
            .trim();

        rawQuote = cleanMarkdown(rawQuote);
        rawAuthor = cleanMarkdown(rawAuthor);

        // 2) Strong intro detection
        const lowerQuote = rawQuote.toLowerCase();
        const looksLikeIntro =
          lowerQuote.startsWith('okay') ||
          lowerQuote.startsWith('ok,') ||
          lowerQuote.includes("here's an inspirational quote") ||
          lowerQuote.includes("here is an inspirational quote") ||
          lowerQuote.includes('here is a quote') ||
          lowerQuote.includes('here\'s a quote');

        // 3) Validation rules
        const valid =
          rawQuote.length >= 15 &&
          rawAuthor.length >= 3 &&
          !BAD_WORDS.some(w => lowerQuote.includes(w)) &&
          !looksLikeIntro;

        if (!valid) {
          throw new Error(`Validation failed: quote="${rawQuote}" author="${rawAuthor}"`);
        }

        quote = rawQuote;
        author = rawAuthor;
        usedModel = model;
        console.log(`✅ Quote success: ${model} -> "${quote}" — ${author}`);
        break;
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

    // If all models failed OR quota hit on Gemini, we still return a clean structure
    if (!quote || !author) {
      console.error('All models failed, returning CLEAN_FALLBACK');
      return res.status(200).json({
        type: 'quote',
        quote: CLEAN_FALLBACK.quote,
        author: CLEAN_FALLBACK.author,
        source: 'fallback'
      });
    }

    return res.status(200).json({
      type: 'quote',
      quote,
      author,
      model: usedModel
    });
  } catch (error) {
    console.error('Quote top-level fallback:', error);
    return res.status(200).json({
      type: 'quote',
      quote: CLEAN_FALLBACK.quote,
      author: CLEAN_FALLBACK.author,
      source: 'fallback-top'
    });
  }
}
