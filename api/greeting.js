import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const MODEL_PRIORITY = [
    'gemma-3-27b-it',      // 131K TPM ✅
    'gemma-3-12b-it',      // 32K TPM ✅
    'gemini-2.0-flash',    // Available
    'gemini-2.5-flash-lite'// Separate quota
  ];

  const BAD_WORDS = ['okay', 'here', 'let', 'craft', 'bunch', 'few', 'tone'];

  try {
    const { greetingType = 'morning', history = [] } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let greeting, usedModel;

    for (const model of MODEL_PRIORITY) {
      try {
        console.log(`Trying greeting model: ${model}`);
        
        const isGeminiModel = model.startsWith('gemini');
        const config = {
          temperature: 0.6,
          maxOutputTokens: 30
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
          systemInstruction: `Data API. No conversation. Single ${greetingType} greeting only.`,
          contents: [{ role: 'user', parts: [{ text: `${greetingType.charAt(0).toUpperCase() + greetingType.slice(1)} greeting` }] }],
          config
        });

        let rawText;
        if (isGeminiModel) {
          const parsed = JSON.parse(response.text);
          rawText = parsed.text.trim();
        } else {
          // Gemma: Nuclear text parsing
          rawText = response.text.trim()
            .replace(/[.!?;,:\[\]"']/g, '')  // Strip everything
            .split('\n')[0]
            .split(' ')
            .slice(0, 10)  // Max 10 words
            .join(' ');
          
          // Capitalize first letter
          rawText = rawText.charAt(0).toUpperCase() + rawText.slice(1);
        }

        const lowerText = rawText.toLowerCase();
        if (rawText.length >= 8 && rawText.length <= 50 && 
            !BAD_WORDS.some(w => lowerText.includes(w)) &&
            rawText.split(' ').length <= 10) {
          greeting = rawText;
          usedModel = model;
          console.log(`✅ Greeting success: ${model} -> "${greeting}"`);
          break;
        }
        throw new Error(`Validation failed: "${rawText}"`);
      } catch (error) {
        const isQuotaError = error.message.includes('429') || error.message.includes('quota');
        const isJsonError = error.message.includes('JSON mode');
        console.error(`❌ Greeting ${model}:`, 
          isQuotaError ? 'QUOTA EXCEEDED - skipping' : 
          isJsonError ? 'JSON UNSUPPORTED - skipping' : 
          error.message);
        continue;  // Skip quota/JSON errors
      }
    }

    if (!greeting) throw new Error('All models exhausted');

    return res.status(200).json({ 
      type: 'greeting', 
      greeting, 
      greetingType, 
      model: usedModel 
    });

  } catch (error) {
    console.error('Greeting final fallback:', error);
    res.status(200).json({ 
      type: 'greeting', 
      greeting: `${greetingType.charAt(0).toUpperCase() + greetingType.slice(1)} beautiful day ahead`, 
      greetingType, 
      source: 'fallback' 
    });
  }
}
