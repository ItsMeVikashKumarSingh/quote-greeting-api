const { GoogleGenerativeAI } = require('@google/generative-ai');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  try {
    let history = [];
    
    // Accept history via POST body or GET query
    if (req.method === 'POST') {
      const bodyString = await new Promise((resolve) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(data));
      });
      const body = JSON.parse(bodyString || '{}');
      history = body.history || [];
    } else if (req.query && req.query.history) {
      history = JSON.parse(req.query.history);
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new Error('API_KEY_MISSING');
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 1.2,  // Higher for variety
        topP: 0.95,
        topK: 40
      }
    });

    const historyText = history.length > 0 
      ? `\n\nPREVIOUSLY GENERATED QUOTES (DO NOT REPEAT):\n${history.slice(0, 10).map((q, i) => `${i+1}. ${q}`).join('\n')}\n` 
      : '';

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: `Generate ONE UNIQUE inspirational quote in this format:
<quote>"Quote text here"
<author>Author Name
${historyText}
REQUIREMENTS:
- Must be completely different from above quotes
- Use diverse topics: success, courage, wisdom, happiness, perseverance, etc.
- Real or inspirational authors
- Keep it concise and powerful

Return ONLY the quote in exact format.`
        }]
      }]
    });

    const text = result.response.text().trim();
    res.status(200).send(text);
    
  } catch (error) {
    console.error('QUOTE_ERROR:', error.message);
    // Return random fallback from pool
    const fallbacks = [
      '<quote>"Success is not final, failure is not fatal."\n<author>Winston Churchill',
      '<quote>"The only way to do great work is to love what you do."\n<author>Steve Jobs',
      '<quote>"Innovation distinguishes between a leader and a follower."\n<author>Steve Jobs',
      '<quote>"Life is 10% what happens to you and 90% how you react to it."\n<author>Charles R. Swindoll',
      '<quote>"The best time to plant a tree was 20 years ago. The second best time is now."\n<author>Chinese Proverb'
    ];
    const random = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    res.status(200).send(random);
  }
}
