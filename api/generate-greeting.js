import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { history = [], greetingType = 'morning' } = req.body || {};
    
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 1.3,
        topK: 50,
        topP: 0.95,
        maxOutputTokens: 150,
      }
    });
    
    const historyText = history.length > 0 
      ? `\n\nPREVIOUSLY USED GREETINGS (DO NOT REPEAT OR USE SIMILAR):\n${history.map((h, i) => `${i + 1}. ${h}`).join('\n')}\n`
      : '';
    
    const greetingPrompts = {
      morning: 'morning greeting like "Good Morning! I hope you slept well"',
      evening: 'evening greeting like "Good Evening! Hope you had a great day"',
      night: 'night greeting like "Good Night! Sleep well and sweet dreams"',
      afternoon: 'afternoon greeting like "Good Afternoon! Hope your day is going well"'
    };
    
    const promptType = greetingPrompts[greetingType] || greetingPrompts.morning;
    
    const prompt = `Generate a unique, warm ${promptType}.${historyText}

REQUIREMENTS:
- Must be COMPLETELY DIFFERENT from any previously used greetings listed above
- Use creative, varied language and different sentence structures
- Keep it genuine and friendly (2-3 sentences maximum)
- Do NOT use quotes or formatting - just plain text
- Be highly creative with fresh wording

Return ONLY the greeting text, nothing else.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let greeting = response.text().trim();
    
    // Clean up response
    greeting = greeting.replace(/^["']|["']$/g, '');
    greeting = greeting.replace(/\n+/g, ' ');
    
    // Simple similarity check
    if (history.length > 0) {
      const firstWords = greeting.split(' ').slice(0, 3).join(' ').toLowerCase();
      const isSimilar = history.some(h => 
        h.toLowerCase().includes(firstWords) || 
        firstWords.includes(h.split(' ').slice(0, 3).join(' ').toLowerCase())
      );
      
      if (isSimilar) {
        // Retry with stronger prompt
        const retryPrompt = `Create a HIGHLY UNIQUE greeting. AVOID these completely: ${history.join('; ')}. Use totally different words and structure.`;
        const retryResult = await model.generateContent(retryPrompt);
        greeting = retryResult.response.text().trim().replace(/^["']|["']$/g, '');
      }
    }
    
    return res.status(200).json({ 
      greeting,
      greetingType,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error generating greeting:', error);
    return res.status(500).json({ 
      error: 'Failed to generate greeting',
      greeting: 'Hello! Wishing you a wonderful day ahead!'
    });
  }
}
