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
    // MANUAL BODY PARSING (Vercel required)
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
    
    const { wishType = 'day', history = [] } = body;
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: { 
        temperature: 1.3,
        maxOutputTokens: 35
      }
    });

    const historyText = history.length ? `\nAvoid: ${history.slice(-3).join('; ')}` : '';
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: `Generate ONE ${wishType} wish (10-20 words):${historyText}

Examples: 
"I wish you a productive and joyful day!", 
"May your evening bring peace and relaxation!"

ONLY wish text:`
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
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('WISH_ERROR:', error.message);
    res.status(200).json({
      type: 'wish',
      wish: `I wish you a wonderful ${wishType || 'day'}!`,
      wishType: wishType || 'day',
      timestamp: new Date().toISOString()
    });
  }
}
