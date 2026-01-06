const { GoogleGenerativeAI } = require('@google/generative-ai');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const bodyString = await new Promise(resolve => {
      let data = '';
      req.on('data', chunk => data += chunk);
      req.on('end', () => resolve(data));
    });
    
    const { wishType = 'day', history = [] } = JSON.parse(bodyString || '{}');
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: { 
        temperature: 1.3,
        maxOutputTokens: 35  // Wish length
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
"May your evening bring peace and relaxation!",
"Hope your night fills with sweet dreams!"

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
    res.status(200).json({
      type: 'wish',
      wish: `I wish you a wonderful ${wishType}!`,
      wishType,
      timestamp: new Date().toISOString()
    });
  }
}
