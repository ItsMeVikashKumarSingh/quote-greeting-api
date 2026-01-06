const { GoogleGenerativeAI } = require('@google/generative-ai');

export default async function handler(req, res) {
  const startTime = Date.now();
  
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
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 1.1,
        maxOutputTokens: 50,  // Limit for speed
        topP: 0.9
      }
    });

    const historyText = history.length > 0 ? 
      `\nAvoid similarity to: ${history.slice(-3).join('; ')}` : '';
    
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: `Generate ONE ${greetingType} greeting.${historyText}

CRITICAL RULES:
- Return ONLY the greeting text
- NO lists, NO options, NO numbering (1., 2., 3.)
- NO markdown (* or -)
- NO multiple greetings
- 1-2 sentences maximum
- Natural and friendly

Example output:
Good ${greetingType}! Wishing you a wonderful day ahead!

Your single greeting:`
        }]
      }]
    });

    let greeting = result.response.text().trim();
    
    // Clean up any formatting issues
    greeting = greeting
      .replace(/^["'`\n\r*-]+|["'`\n\r*-]+$/g, '')  // Remove quotes/bullets
      .replace(/^\d+\.\s*/gm, '')  // Remove numbering
      .replace(/^Here.*?:\s*/i, '')  // Remove "Here are" intros
      .replace(/\n+/g, ' ')  // Single line
      .replace(/\s{2,}/g, ' ')  // Clean spaces
      .split(/\n|\*|•/)[0]  // Take only first line/option
      .trim();

    const responseTime = Date.now() - startTime;

    res.status(200).json({
      success: true,
      greeting,
      greetingType,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('GREETING_ERROR:', error.message);
    const fallbacks = {
      morning: 'Good morning! Wishing you a productive and energized day ahead!',
      evening: 'Good evening! Hope your day was great and you enjoy a relaxing night!',
      night: 'Good night! Sleep well and recharge for tomorrow!',
      afternoon: 'Good afternoon! Hope your day is going wonderfully!'
    };
    
    res.status(200).json({
      success: false,
      greeting: fallbacks[greetingType] || fallbacks.morning,
      greetingType,
      responseTime: `${Date.now() - startTime}ms`,
      timestamp: new Date().toISOString()
    });
  }
}
