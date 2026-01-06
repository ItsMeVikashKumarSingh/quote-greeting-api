const { GoogleGenerativeAI } = require('@google/generative-ai');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  try {
    let body = {};
    if (req.body) {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    }
    
    const { greetingType = 'morning', history = [] } = body;
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: { temperature: 1.2 }
    });
    
    const historyText = history.length ? `Avoid: ${history.join(', ')}` : '';
    const prompt = `Generate unique ${greetingType} greeting. ${historyText}`;
    
    const result = await model.generateContent(prompt);
    const greeting = result.response.text().trim().replace(/^["']|["']$/g, '');
    
    res.status(200).json({ 
      greeting, 
      greetingType, 
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error(error);
    res.status(200).json({ 
      greeting: 'Hello! Have a wonderful day!',
      greetingType: 'morning',
      timestamp: new Date().toISOString()
    });
  }
}
