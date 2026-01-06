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
    
    const { wishType = 'day', history = [] } = body;
    
    // QUOTA-PROOF FALLBACKS
    const wishFallbacks = {
      day: ['Wishing you a productive day!', 'Have an amazing day!', 'Make today count!'],
      evening: ['Enjoy your evening!', 'Peaceful evening ahead!', 'Relax and recharge!'],
      night: ['Sweet dreams tonight!', 'Rest well tonight!', 'Goodnight wishes!'],
      afternoon: ['Great afternoon ahead!', 'Power through afternoon!', 'Afternoon success!']
    };
    
    const fallback = wishFallbacks[wishType]?.[
      Math.floor(Math.random() * wishFallbacks[wishType].length)
    ] || 'Have a great day!';
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(200).json({
        type: 'wish',
        wish: fallback,
        wishType,
        source: 'fallback',
        timestamp: new Date().toISOString()
      });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash-8b',  // UNLIMITED FREE TIER
      generationConfig: { 
        temperature: 1.3,
        maxOutputTokens: 30
      }
    });

    const historyText = history.length ? `\nAvoid: ${history.slice(-3).join('; ')}` : '';
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: `ONE ${wishType} wish (8-15 words):${historyText}

Examples: "Wishing you a productive day!", "May your evening bring peace!"

Wish:`
        }]
      }]
    });

    let wish = result.response.text().trim()
      .replace(/^["'`•*-]+|["'`•*-]+$/g, '')
      .replace(/^\d+\.\s*/g, '')
      .split('\n')[0]
      .trim();

    res.status(200).json({
      type: 'wish',
      wish,
      wishType,
      source: 'ai',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('WISH_ERROR:', error.message);
    const wishFallbacks = {
      day: ['Wishing you success today!', 'Have a great day ahead!'],
      evening: ['Enjoy your evening hours!', 'Peaceful evening wishes!'],
      night: ['Sweet dreams await you!', 'Rest well tonight!'],
      afternoon: ['Power through your afternoon!']
    };
    
    const fallback = wishFallbacks[wishType]?.[
      Math.floor(Math.random() * wishFallbacks[wishType].length)
    ] || 'Have a wonderful day!';
    
    res.status(200).json({
      type: 'wish',
      wish: fallback,
      wishType,
      source: 'fallback',
      error: error.message.includes('429') ? 'quota_exceeded' : 'ai_error',
      timestamp: new Date().toISOString()
    });
  }
}
