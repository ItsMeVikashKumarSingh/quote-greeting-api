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

  const BAD_WORDS = ['okay', 'here', 'let', 'craft'];

  try {
    const { greetingType = 'morning' } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let greeting = null;
    let usedModel = null;

    for (const model of MODEL_PRIORITY) {
      try {
        console.log(`Trying greeting model: ${model}`);
        const isGeminiModel = model.startsWith('gemini');

        const config = {
          temperature: 0.6,
          maxOutputTokens: 25
        };

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
          systemInstruction: `Data API only. Single ${greetingType} greeting sentence. No intro. No lists.`,
          contents: [
            {
              role: 'user',
              parts: [{ text: `${greetingType.charAt(0).toUpperCase() + greetingType.slice(1)} greeting` }]
            }
          ],
          config
        });

        let rawText;

        if (isGeminiModel) {
          const parsed = JSON.parse(response.text);
          rawText = (parsed.text || '').trim();
        } else {
          rawText = response.text
            .trim()
            .replace(/^[^\w]*|["'.,;:!?]+$/g, '')
            .split('\n')[0]
            .split(/\s+/)
            .slice(0, 8)
            .join(' ')
            .replace(/\b\w/g, l => l.toUpperCase());
        }

        const lowerText = rawText.toLowerCase();
        if (
          rawText.length >= 8 &&
          rawText.length <= 45 &&
          !BAD_WORDS.some(w => lowerText.includes(w))
        ) {
          greeting = rawText;
          usedModel = model;
          console.log(`✅ Greeting success: ${model}`);
          break;
        } else {
          throw new Error(`Validation failed: "${rawText}"`);
        }
      } catch (error) {
        const msg = String(error.message || error);
        const isJsonError = msg.includes('JSON mode');
        console.error(
          `❌ Greeting ${model}:`,
          isJsonError ? 'JSON UNSUPPORTED - skip' : msg
        );
        continue;
      }
    }

    return res.status(200).json({
      type: 'greeting',
      greeting: greeting || 'Good morning beautiful day',
      greetingType,
      model: usedModel || 'none'
    });
  } catch (error) {
    console.error('Greeting fallback:', error);
    const greetingType = (req.body && req.body.greetingType) || 'morning';
    return res.status(200).json({
      type: 'greeting',
      greeting: 'Rise and shine today',
      greetingType,
      source: 'fallback'
    });
  }
}
