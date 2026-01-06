const { GoogleGenerativeAI } = require('@google/generative-ai');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST required' });
    return;
  }

  try {
    const bodyString = await new Promise((resolve) => {
      let data = '';
      req.on('data', chunk => data += chunk);
      req.on('end', () => resolve(data));
    });
    
    const body = JSON.parse(bodyString || '{}');
    const { greetingType = 'morning', history = [] } = body;
    
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('API_KEY_MISSING');
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 1.3,
        topP: 0.9,
        maxOutputTokens: 80
      }
    });

    const historyText = history.slice(0, 5).join('; ') ? 
      `Avoid similarity to previous: ${history.slice(0, 5).join('; ')}` : '';
    
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: `Generate unique ${greetingType} greeting. ${historyText}
          
Be creative, natural, 1-2 sentences max. Like: "Rise and shine!"`
        }]
      }]
    });

    let greeting = result.response.text().trim();
    greeting = greeting.replace(/^["'`]+|["'`]+$/g, '').replace(/\n+/g, ' ');

    res.status(200).json({
      success: true,
      greeting,
      greetingType,
      historyUsed: history.length,
      tokensUsed: result.response.usageMetadata?.promptTokenCount || 0,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('GREETING_ERROR:', error.message);
    res.status(200).json({
      success: false,
      greeting: `Good ${greetingType}! Wishing you success!`,
      greetingType,
      historyUsed: 0,
      timestamp: new Date().toISOString()
    });
  }
}
