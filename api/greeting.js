const { GoogleGenerativeAI } = require('@google/generative-ai');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST required' });
    return;
  }

  try {
    let bodyString = '';
    req.on('data', chunk => bodyString += chunk);
    
    const body = await new Promise(resolve => {
      req.on('end', () => {
        try {
          resolve(bodyString ? JSON.parse(bodyString) : {});
        } catch {
          resolve({});
        }
      });
    });
    
    const { greetingType = 'morning', history = [] } = body;
    
    // SMART FALLBACKS (No AI needed)
    const greetingFallbacks = {
      morning: ['Good morning!', 'Rise and shine!', 'Morning sunshine!', 'Hello morning!'],
      evening: ['Good evening!', 'Evening vibes!', 'Hey evening!', 'Evening greetings!'],
      night: ['Good night!', 'Sweet dreams!', 'Night night!', 'Sleep well!'],
      afternoon: ['Good afternoon!', 'Afternoon boost!', 'Hey afternoon!', 'Afternoon vibes!']
    };
    
    const fallback = greetingFallbacks[greetingType]?.[
      Math.floor(Math.random() * greetingFallbacks[greetingType].length)
    ] || 'Hello!';
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(200).json({
        type: 'greeting',
        greeting: fallback,
        greetingType,
        source: 'fallback',
        timestamp: new Date().toISOString()
      });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash-8b',  // HIGHER QUOTA LIMITS
      generationConfig: { 
        temperature: 1.4,
        maxOutputTokens: 20
      }
    });

    const historyText = history.length ? `\nAvoid: ${history.slice(-3).join('; ')}` : '';
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: `ONE SHORT ${greetingType} greeting (3-6 words):${historyText}

Examples: Good morning! Evening vibes!

Greeting:`
        }]
      }]
    });

    let greeting = result.response.text().trim()
      .replace(/^["'`•*-]+|["'`•*-]+$/g, '')
      .replace(/^\d+\.\s*/g, '')
      .split('\n')[0]
      .trim();

    res.status(200).json({
      type: 'greeting',
      greeting,
      greetingType,
      source: 'ai',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('GREETING_ERROR:', error.message);
    // QUOTA-PROOF FALLBACK
    const greetingFallbacks = {
      morning: ['Good morning!', 'Rise and shine!', 'Morning sunshine!'],
      evening: ['Good evening!', 'Evening vibes!', 'Hey evening!'],
      night: ['Good night!', 'Sweet dreams!', 'Night night!'],
      afternoon: ['Good afternoon!', 'Afternoon boost!', 'Hey afternoon!']
    };
    
    const fallback = greetingFallbacks[greetingType]?.[
      Math.floor(Math.random() * greetingFallbacks[greetingType].length)
    ] || 'Hello!';
    
    res.status(200).json({
      type: 'greeting',
      greeting: fallback,
      greetingType,
      source: 'fallback',
      error: error.message.includes('429') ? 'quota_exceeded' : 'ai_error',
      timestamp: new Date().toISOString()
    });
  }
}
