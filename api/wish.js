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

  const BAD_WORDS = ['okay', 'here', 'few', 'tone'];

  try {
    const { wishType = 'day' } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let wish = null;
    let usedModel = null;

    for (const model of MODEL_PRIORITY) {
      try {
        console.log(`Trying wish model: ${model}`);

        const isGeminiModel = model.startsWith('gemini');

        const config = {
          temperature: 0.8,
          maxOutputTokens: 45
        };

        // JSON mode ONLY for Gemini
        if (isGeminiModel) {
          config.responseMimeType = 'application/json';
          config.responseSchema = {
            type: 'object',
            properties: { text: { type: 'string' } },
            required: ['text']
          };
        }

        const response = await ai.models.generateContent({
          model,
          systemInstruction: `Data API. Single ${wishType} wish sentence. No lists. No explanation.`,
          contents: [
            {
              role: 'user',
              parts: [{ text: `${wishType.charAt(0).toUpperCase() + wishType.slice(1)} wish` }]
            }
          ],
          config
        });

        let rawText;

        if (isGeminiModel) {
          const parsed = JSON.parse(response.text);
          rawText = (parsed.text || '').trim();
        } else {
          // Gemma text parsing
          rawText = response.text
            .trim()
            .replace(/[.!?;,:[\]"']/g, '')
            .split('\n')[0]
            .split(/\s+/)
            .slice(0, 12)
            .join(' ') + '.';
        }

        const lowerText = rawText.toLowerCase();
        if (
          rawText.length >= 12 &&
          rawText.length <= 80 &&
          !BAD_WORDS.some(w => lowerText.includes(w))
        ) {
          wish = rawText;
          usedModel = model;
          console.log(`✅ Wish success: ${model} -> "${wish}"`);
          break;
        } else {
          throw new Error(`Validation failed: "${rawText}"`);
        }
      } catch (error) {
        const msg = String(error.message || error);
        const isQuotaError = msg.includes('429') || msg.toLowerCase().includes('quota');
        const isJsonError = msg.includes('JSON mode');

        console.error(
          `❌ Wish ${model}:`,
          isQuotaError ? 'QUOTA - skip'
          : isJsonError ? 'JSON UNSUPPORTED - skip'
          : msg
        );
        continue;
      }
    }

    if (!wish) {
      throw new Error('All models failed');
    }

    return res.status(200).json({ type: 'wish', wish, wishType, model: usedModel });
  } catch (error) {
    console.error('Wish fallback:', error);
    const wishType = (req.body && req.body.wishType) || 'day';
    return res.status(200).json({
      type: 'wish',
      wish: `Wishing you a wonderful ${wishType}.`,
      wishType,
      source: 'fallback'
    });
  }
}
