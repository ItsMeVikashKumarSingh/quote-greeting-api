import { GoogleGenAI } from '@google/genai';

// Priority List: Smartest -> Fastest -> Highest Free Quota
const MODEL_FALLBACKS = [
  'gemini-3-pro-preview',   // Tier 1: PhD reasoning, lowest free limit
  'gemini-3-flash-preview', // Tier 2: Great variety, medium free limit
  'gemini-2.5-flash-lite'   // Tier 3: Workhorse, 1,000 req/day free limit
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');

  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('API_KEY_MISSING');

    // Parse history from POST or GET
    let history = [];
    if (req.method === 'POST') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
      history = body.history || [];
    } else {
      history = req.query.history ? JSON.parse(req.query.history) : [];
    }

    const ai = new GoogleGenAI({ apiKey });
    const historyText = history.length > 0 
      ? `\n\nPREVIOUSLY GENERATED (DO NOT REPEAT):\n${history.slice(0, 10).join('\n')}\n` 
      : '';

    const prompt = `Generate ONE UNIQUE inspirational quote.
<quote>"Quote text here"
<author>Author Name
${historyText}
REQUIREMENTS:
- Diverse topics: courage, wisdom, perseverance.
- Real or inspirational authors.
Return ONLY the quote in exact format.`;

    // FALLBACK LOOP
    let lastError = null;
    for (const modelId of MODEL_FALLBACKS) {
      try {
        const response = await ai.models.generateContent({
          model: modelId,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { 
            temperature: 1.2,
            maxOutputTokens: 100 
          }
        });

        // SUCCESS: Return the generated text
        return res.status(200).send(response.text.trim());
        
      } catch (err) {
        lastError = err;
        // If it's a Quota (429) or Overloaded (503) error, try the next model
        if (err.message.includes('429') || err.message.includes('503')) {
          console.warn(`Fallback: ${modelId} failed, trying next...`);
          continue;
        }
        break; // If it's a structural error (like 400), don't bother retrying
      }
    }

    throw lastError || new Error("All models failed");

  } catch (error) {
    console.error('FINAL_ERROR:', error.message);
    const fallbacks = [
      '<quote>"The only way to do great work is to love what you do."\n<author>Steve Jobs',
      '<quote>"Success is not final, failure is not fatal."\n<author>Winston Churchill',
      '<quote>"Make each day your masterpiece."\n<author>John Wooden'
    ];
    res.status(200).send(fallbacks[Math.floor(Math.random() * fallbacks.length)]);
  }
}