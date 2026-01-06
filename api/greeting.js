const { GoogleGenerativeAI } = require('@google/generative-ai');

const MODELS = [
  'gemini-2.0-flash-exp',
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-pro',
  'gemini-1.0-pro'
];

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
      req.on('end', () => resolve(bodyString ? JSON.parse(bodyString) : {}));
    });
    
    const { greetingType = 'morning', history = [] } = body;
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Try models until one works
    let greeting = '';
    let usedModel = '';
    
    for (const modelName of MODELS) {
      try {
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: { temperature: 1.5, maxOutputTokens: 25 }
        });
        
        const result = await model.generateContent(`ONE SHORT ${greetingType} greeting (3-8 words):
Examples: "Good morning!", "Rise and shine!"

Greeting:`);
        
        greeting = result.response.text().trim().replace(/^["'`]/, '').split('\n')[0];
        usedModel = modelName;
        break;
      } catch (error) {
        console.log(`Model ${modelName} failed:`, error.message);
        continue;
      }
    }
    
    // If all models fail, use fallback
    if (!greeting) {
      const fallbacks = {
        morning: ['Good morning!', 'Rise and shine!'],
        evening: ['Good evening!', 'Evening vibes!'],
        night: ['Good night!', 'Sweet dreams!'],
        afternoon: ['Good afternoon!', 'Afternoon boost!']
      };
      greeting = fallbacks[greetingType]?.[Math.floor(Math.random() * 2)] || 'Hello!';
      usedModel = 'fallback';
    }

    res.status(200).json({
      type: 'greeting',
      greeting,
      greetingType,
      modelUsed: usedModel,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
