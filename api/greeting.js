const { GoogleGenerativeAI } = require('@google/generative-ai');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST required' });
    return;
  }

  try {
    // MANUAL BODY PARSING
    let bodyString = '';
    req.on('data', chunk => {
      bodyString += chunk;
    });
    
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
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: { 
        temperature: 1.4,
        maxOutputTokens: 25
      }
    });

    const historyText = history.length ? `\nAvoid: ${history.slice(-3).join('; ')}` : '';
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: `Generate ONE SHORT ${greetingType} greeting (3-8 words):${historyText}

Examples: "Good morning!", "Rise and shine!", "Evening vibes!"

ONLY greeting text:`
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
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('GREETING_ERROR:', error.message);
    res.status(200).json({
      type: 'greeting',
      greeting: `Good ${greetingType}!`,
      greetingType,
      timestamp: new Date().toISOString()
    });
  }
}
