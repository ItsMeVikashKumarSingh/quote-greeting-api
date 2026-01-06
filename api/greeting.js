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
        temperature: 1.5,        // MAXIMUM creativity
        topP: 0.95,
        topK: 64,                // More token choices
        maxOutputTokens: 80      // Enough for 2 sentences
      }
    });

    // Dynamic prompt with examples for variety
    const greetingExamples = {
      morning: [
        "Rise and shine! Wishing you an incredible day!",
        "Good morning! May your coffee be strong and your day be amazing!",
        "Morning sunshine! Hope you're ready to conquer the day!"
      ],
      evening: [
        "Good evening! Hope your day was productive and fulfilling!",
        "Evening vibes! Time to unwind and recharge for tomorrow.",
        "As the day winds down, wishing you peaceful moments ahead!"
      ],
      night: [
        "Good night! Sweet dreams and restful sleep!",
        "Night night! Recharge well for tomorrow's adventures!",
        "Time for stars and sleep! Sweet dreams!"
      ],
      afternoon: [
        "Good afternoon! Powering through the day strong!",
        "Afternoon boost! You've got this!",
        "Happy afternoon! Keep shining!"
      ]
    };

    const examples = greetingExamples[greetingType] || greetingExamples.morning;
    const historyText = history.length > 0 ? 
      `\nAVOID: ${history.slice(-3).join('; ')}` : '';
    
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: `Generate ONE unique ${greetingType} greeting like these examples (but different):
${examples.map(ex => `• ${ex}`).join('\n')}${historyText}

STRICT RULES:
- ONE greeting only
- 8-20 words (full sentence)
- Friendly, warm, natural tone
- NO lists, numbers, bullets
- NO "Here are", "Options", "Suggestions"
- Return ONLY the greeting text

Greeting:`
        }]
      }],
      generationConfig: {
        temperature: 1.5,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 80
      }
    });

    let greeting = result.response.text().trim();
    
    // Aggressive cleaning
    greeting = greeting
      .replace(/^["'`•*-]+|["'`•*-]+$/g, '')
      .replace(/^(\d+\.|-|\*|\[.*?\]|\{.*?\})\s*/gm, '')
      .replace(/^Here.*?:\s*/i, '')
      .replace(/^Greeting:?\s*/i, '')
      .replace(/\n+/g, ' ')
      .split('.')[0]  // First sentence only
      .trim();

    // Fallback if too short
    if (greeting.length < 10) {
      const fallbackGreetings = {
        morning: "Good morning! Wishing you energy and success today!",
        evening: "Good evening! Hope your day was amazing!",
        night: "Good night! Sweet dreams and rest well!",
        afternoon: "Good afternoon! Keep up the great work!"
      };
      greeting = fallbackGreetings[greetingType] || fallbackGreetings.morning;
    }

    const responseTime = Date.now() - startTime;

    res.status(200).json({
      success: true,
      greeting,
      greetingType,
      responseTime: `${responseTime}ms`,
      wordCount: greeting.split(' ').length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('GREETING_ERROR:', error.message);
    res.status(200).json({
      success: false,
      greeting: 'Hello! Have a wonderful day!',
      greetingType: 'morning',
      responseTime: `${Date.now() - startTime}ms`,
      timestamp: new Date().toISOString()
    });
  }
}
