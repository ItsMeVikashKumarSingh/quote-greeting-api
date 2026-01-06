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

  // We will completely ignore any text that is not in this pattern:
  // <quote>Some quote text
  // <author>Author Name
  const QUOTE_BLOCK_REGEX = /<quote>(.+?)\n<author>(.+?)(?:\n|$)/gis;

  // Last-resort fallback
  const FALLBACK = {
    quote: "The future belongs to those who believe in the beauty of their dreams.",
    author: "Eleanor Roosevelt"
  };

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let quote = null;
    let author = null;
    let usedModel = null;

    for (const model of MODEL_PRIORITY) {
      try {
        console.log(`Trying quote model: ${model}`);

        // Single, extremely strict instruction for ALL models
        const systemInstruction = [
          'You are a quote data API.',
          'You MUST respond ONLY in this exact format, with no extra text before, between, or after blocks:',
          '',
          '<quote>Quote sentence 1',
          '<author>Author Name 1',
          '',
          '<quote>Quote sentence 2',
          '<author>Author Name 2',
          '',
          'Rules:',
          '- Do NOT write any introductions like "Here is a quote" or "Okay, here\'s..."',
          '- Do NOT add markdown, **, ``` or any other formatting.',
          '- Do NOT wrap the quote in additional quotation marks unless they are part of the quote itself.',
          '- Do NOT add bullets, numbering, or explanations.',
          '- Each quote block MUST be exactly two lines: one <quote> line and one <author> line.',
          '- You may return one or more such blocks, but nothing else.',
        ].join('\n');

        const response = await ai.models.generateContent({
          model,
          systemInstruction,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: 'Return exactly ONE inspirational quote and its author using the <quote> and <author> format described.'
                }
              ]
            }
          ],
          config: {
            temperature: 0.4,
            maxOutputTokens: 120
          }
        });

        const raw = (response.text || '').trim();
        console.log(`Raw response from ${model}:\n${raw}`);

        // Extract the first valid <quote>… <author>… block
        const match = QUOTE_BLOCK_REGEX.exec(raw);

        if (!match) {
          throw new Error('No <quote>/<author> block found');
        }

        let rawQuote = match.trim();[1]
        let rawAuthor = match.trim();[2]

        // Clean possible outer quotes and markdown
        const clean = (s) =>
          s
            .replace(/^\s*["']+|\s*["']+$/g, '') // leading/trailing quotes
            .replace(/\*\*/g, '')               // remove bold markers
            .replace(/`/g, '')                  // remove backticks
            .trim();

        rawQuote = clean(rawQuote);
        rawAuthor = clean(rawAuthor);

        // Basic sanity checks
        if (rawQuote.length < 10) {
          throw new Error(`Quote too short: "${rawQuote}"`);
        }
        if (rawAuthor.length < 2) {
          throw new Error(`Author too short: "${rawAuthor}"`);
        }

        quote = rawQuote;
        author = rawAuthor;
        usedModel = model;

        console.log(`✅ Parsed quote from ${model}: "${quote}" — ${author}`);
        break;
      } catch (error) {
        const msg = String(error.message || error);
        const isQuotaError = msg.includes('429') || msg.toLowerCase().includes('quota');

        console.error(
          `❌ Quote ${model}:`,
          isQuotaError ? 'QUOTA - skip' : msg
        );
        if (isQuotaError) {
          // Move on to the next model
          continue;
        }
        // For non-quota errors, also continue to next model
        continue;
      }
    }

    if (!quote || !author) {
      console.error('All models failed, using FALLBACK');
      return res.status(200).json({
        type: 'quote',
        quote: FALLBACK.quote,
        author: FALLBACK.author,
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
    console.error('Quote top-level error:', error);
    return res.status(200).json({
      type: 'quote',
      quote: FALLBACK.quote,
      author: FALLBACK.author,
      source: 'fallback-top'
    });
  }
}
