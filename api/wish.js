import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const { wishType = 'day', history = [] } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemma-3-12b-it',
      systemInstruction: `You are a Wish API. Return ONLY one beautiful ${wishType} wish sentence. 
      No quotes. No explanations. Completely avoid history phrases.`,
      contents: [{ 
        role: 'user', 
        parts: [{ text: `Unique ${wishType} wish. Avoid these: ${history.join('; ')}.` }] 
      }],
      config: { 
        temperature: 1.4, 
        maxOutputTokens: 100 
      }
    });

    let wish = response.text.trim().replace(/["'\n]+/g, '');
    
    // Validation: must be reasonable length and not empty
    if (wish.length < 10 || wish.length > 150) {
      throw new Error('Invalid wish length');
    }
    
    return res.status(200).json({ 
      type: 'wish', 
      wish, 
      wishType, 
      model: 'gemma-3-12b-it' 
    });
  } catch (error) {
    res.status(200).json({ 
      type: 'wish', 
      wish: "May your day be filled with unexpected joy!", 
      wishType: 'day',
      source: 'fallback' 
    });
  }
}
