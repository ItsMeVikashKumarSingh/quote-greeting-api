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

  // Pattern: <quote>...newline<author>...
  const QUOTE_BLOCK_REGEX = /<quote>(.+?)\n<author>(.+?)(?:\n|$)/is;

  const FALLBACK = {
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

        const systemInstruction = [
          'You are a quote data API.',
          'Respond ONLY in this exact pattern, no other text:',
          '',
          '<quote>Quote sentence',
          '<author>Author Name',
          '',
          'Rules:',
          '- No introduction such as "Here is a quote" or "Okay, here\'s...".',
          '- No markdown (** or ```).',
          '- Exactly two lines per quote: one <quote>, one <author>.',
          '- Return exactly ONE quote block.',
        ].join('\n');

        const response = await ai.models.generateContent({
          model,
          systemInstruction,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text:
                    'Return exactly ONE inspirational quote in the <quote>/<author> format.'
                }
              ]
            }
          ],
          config: {
            temperature: 0.3,
            maxOutputTokens: 60
          }
        });

  // SAFETY: handle different shapes of response
let raw;

if (typeof response?.text === 'string') {
  // Case 1: SDK exposes .text directly
  raw = response.text;
} else if (
  Array.isArray(response?.candidates) &&
  response.candidates[0]?.content?.parts?.[0]?.text
) {
  // Case 2: candidates[0].content.parts[0].text
  raw = response.candidates[0].content.parts[0].text;
} else {
  throw new Error('No text in response');
}

raw = String(raw).trim();

        console.log(`Raw response from ${model}:\n${raw}`);

        const match = raw.match(QUOTE_BLOCK_REGEX);
        if (!match) {
          throw new Error('No <quote>/<author> block found');
        }

        let rawQuote = match;[1]
        let rawAuthor = match;[2]

        const clean = (s) =>
          String(s || '')
            .replace(/^\s*["']+|\s*["']+$/g, '') // trim outer quotes
            .replace(/\*\*/g, '')               // remove **
            .replace(/`/g, '')                  // remove backticks
            .trim();

        rawQuote = clean(rawQuote);
        rawAuthor = clean(rawAuthor);

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
        const isQuotaError =
          msg.includes('429') || msg.toLowerCase().includes('quota');

        console.error(
          `❌ Quote ${model}:`,
          isQuotaError ? 'QUOTA - skip' : msg
        );

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
