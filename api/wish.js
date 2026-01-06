import { GoogleGenAI } from '@google/genai';

// Model Priority: Try latest smart models first, fall back to the "Always Free" workhorse
const MODEL_FALLBACKS = [
  'gemini-3-flash-preview', // Tier 1: Best quality for wishes
  'gemini-2.5-flash',       // Tier 2: Strong reasoning
  'gemini-2.5-flash-lite'   // Tier 3: The Fallback - 1,000 req/day limit
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST required' });
  }

  // Define fallbacks inside the handler for access to wishType
  const wishFallbacks = {
    day: ['Wishing you a productive day!', 'Have an amazing day!', 'Make today count!'],
    evening: ['Enjoy your evening!', 'Peaceful evening ahead!', 'Relax and recharge!'],
    night: ['Sweet dreams tonight!', 'Rest well tonight!', 'Goodnight wishes!'],
    afternoon: ['Great afternoon ahead!', 'Power through afternoon!', 'Afternoon success!']
  };

  try {
    // Modern Vercel Body Parsing
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
    
    const { wishType = 'day', history = [] } = body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) throw new Error('API_KEY_MISSING');

    const ai = new GoogleGenAI({ apiKey });
    const historyText = history.length ? `\nAvoid: ${history.slice(-3).join('; ')}` : '';
    
    const prompt = `ONE ${wishType} wish (8-15 words):${historyText}
    Examples: "Wishing you a productive day!", "May your evening bring peace!"
    Wish:`;

    let finalWish = '';
    let usedModel = '';

    // FALLBACK LOOP
    for (const modelId of MODEL_FALLBACKS) {
      try {
        const response = await ai.models.generateContent({
          model: modelId,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { 
            temperature: 1.3, 
            maxOutputTokens: 50 
          }
        });

        finalWish = response.text.trim()
          .replace(/^["'`•*-]+|["'`•*-]+$/g, '')
          .replace(/^\d+\.\s*/g, '')
          .split('\n')[0]
          .trim();
        
        usedModel = modelId;
        break; // Exit loop on success
      } catch (err) {
        if (err.message.includes('429') || err.message.includes('Quota')) {
          console.warn(`Fallback: ${modelId} limited. Trying next...`);
          continue; 
        }
        throw err; // Real error, stop loop
      }
    }

    if (!finalWish) throw new Error('AI_GENERATION_FAILED');

    return res.status(200).json({
      type: 'wish',
      wish: finalWish,
      wishType,
      source: 'ai',
      model: usedModel,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('WISH_ERROR:', error.message);
    
    // Safety Fallback Logic
    const type = req.body?.wishType || 'day';
    const pool = wishFallbacks[type] || wishFallbacks['day'];
    const randomFallback = pool[Math.floor(Math.random() * pool.length)];

    return res.status(200).json({
      type: 'wish',
      wish: randomFallback,
      wishType: type,
      source: 'fallback',
      reason: error.message.includes('429') ? 'quota_limit' : 'error',
      timestamp: new Date().toISOString()
    });
  }
}