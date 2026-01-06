import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const MODEL_PRIORITY = [
    'gemma-3-27b-it',      // Text mode only
    'gemma-3-12b-it',      // Text mode only  
    'gemini-2.0-flash',    // JSON mode ✅
    'gemini-2.5-flash-lite'// JSON mode ✅
  ];

  const BAD_WORDS = ['okay', 'here', 'few', 'tone'];

  try {
    const { wishType = 'day', history = [] } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let wish, usedModel;

    for (const model of MODEL_PRIORITY) {
      try {
        console.log(`Trying wish model: ${model}`);
        
        // DYNAMIC CONFIG - JSON only for Gemini
        const isGeminiModel = model.startsWith('gemini');
        const config = {
          temperature: 0.8,
          maxOutputTokens: 45
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
          systemInstruction: `Data API. Single ${wishType} wish sentence. No lists. No explanation.`,
          contents: [{ role: 'user', parts: [{ text: `${wishType.charAt(0).toUpperCase() + wishType.slice(1)} wish` }] }],
          config
        });

        let rawText;
        if (isGeminiModel) {
          const parsed = JSON.parse(response.text);
          rawText = parsed.text.trim();
        } else {
          // Gemma: Aggressive text parsing
          rawText = response.text.trim()
            .replace(/[.!?;,:\[\]"']/g, '')
            .split('\n')[0]
            .split(' ')
            .slice(0, 12)
            .join(' ') + '.';
        }

        const lowerText = rawText.toLowerCase();
        if (rawText.length >= 12 && rawText.length <= 80 && 
            !BAD_WORDS.some(w => lowerText.includes(w))) {
          wish = rawText;
          usedModel = model;
          console.log(`✅ Wish success: ${model} -> "${wish}"`);
          break;
        }
        throw new Error('Validation failed');
      } catch (error) {
        const isQuotaError = error.message.includes('429') || error.message.includes('quota');
        const isJsonError = error.message.includes('JSON mode');
        console.error(`❌ Wish ${model}:`, 
          isQuotaError ? 'QUOTA - skip' : 
          isJsonError ? 'JSON UNSUPPORTED - skip' : 
          error.message);
        continue;  // Skip quota/JSON errors
      }
    }

    if (!wish) throw new Error('All models failed');

    return res.status(200).json({ type: 'wish', wish, wishType, model: usedModel });

  } catch (error) {
    console.error('Wish fallback:', error);
    res.status(200).json({ 
      type: 'wish', 
      wish: `Wishing you a wonderful ${wishType}.`, 
      wishType, 
      source: 'fallback' 
    });
  }
}
