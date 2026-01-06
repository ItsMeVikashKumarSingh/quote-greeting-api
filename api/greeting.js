import { GoogleGenAI } from '@google/genai';

// Priority: Try latest smart models first, fallback to high-quota models
const MODEL_FALLBACKS = [
  'gemini-3-flash-preview', // Best quality & speed
  'gemini-2.5-flash',       // Reliable middle tier
  'gemini-2.5-flash-lite'   // Always Free Tier (1,000 req/day)
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST required' });
  }

  const fallbacks = {
    morning: ['Good morning!', 'Rise and shine!', 'Morning vibes!'],
    evening: ['Good evening!', 'Evening peace!', 'Relaxing evening!'],
    night: ['Good night!', 'Sweet dreams!', 'Rest well!'],
    afternoon: ['Good afternoon!', 'Afternoon boost!', 'Great afternoon!']
  };

  try {
    // Vercel Body Parsing (Node 22 / ESM optimized)
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
    
    const { greetingType = 'morning' } = body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) throw new Error('API_KEY_MISSING');

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `ONE SHORT ${greetingType} greeting (3-8 words):
    Examples: "Good morning!", "Rise and shine!"
    Greeting:`;

    let finalGreeting = '';
    let usedModel = '';

    // TIERED FALLBACK LOOP
    for (const modelId of MODEL_FALLBACKS) {
      try {
        const response = await ai.models.generateContent({
          model: modelId,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { 
            temperature: 1.5, 
            maxOutputTokens: 25 
          }
        });

        finalGreeting = response.text.trim()
          .replace(/^["'`]|["'`]$/g, '') // Remove quotes
          .split('\n')[0];               // Take first line only
        
        usedModel = modelId;
        break; // Stop if successful
      } catch (err) {
        // If it's a Quota error (429), try the next model
        if (err.message.includes('429') || err.message.includes('Quota')) {
          console.warn(`Fallback: ${modelId} reached limit. Trying next...`);
          continue; 
        }
        throw err; // Stop if it's a structural error
      }
    }

    if (!finalGreeting) throw new Error('AI_FAILED');

    return res.status(200).json({
      type: 'greeting',
      greeting: finalGreeting,
      greetingType,
      modelUsed: usedModel,
      source: 'ai',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('GREETING_ERROR:', error.message);
    
    // Safety Fallback pool
    const type = req.body?.greetingType || 'morning';
    const pool = fallbacks[type] || ['Hello!', 'Hi there!'];
    const greeting = pool[Math.floor(Math.random() * pool.length)];

    return res.status(200).json({
      type: 'greeting',
      greeting,
      greetingType: type,
      modelUsed: 'fallback',
      source: 'hardcoded',
      reason: error.message.includes('429') ? 'quota_limit' : 'error',
      timestamp: new Date().toISOString()
    });
  }
}