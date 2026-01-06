import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const { history = [] } = req.body || {};
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemma-3-27b-it',
      systemInstruction: `You are a Quote API. Generate ONE unique inspirational quote + author. 
      Format EXACTLY: "Quote text" followed by author name on new line. 
      NEVER repeat from history. No explanations.`,
      contents: [{ 
        role: 'user', 
        parts: [{ text: `New quote. History to avoid: ${history.join('; ')}.` }] 
      }],
      config: { 
        temperature: 1.2, 
        topK: 50,
        maxOutputTokens: 300 
      }
    });

    const text = response.text.trim();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    
    if (lines.length >= 2) {
      const quote = lines[0].replace(/^["']|["']$/g, '');
      const author = lines.slice(1).join(' ');
      return res.status(200).json({ 
        type: 'quote', 
        quote, 
        author, 
        model: 'gemma-3-27b-it' 
      });
    }
    throw new Error("Bad Format");
  } catch (error) {
    res.status(200).json({ 
      type: 'quote', 
      quote: "The best way to predict the future is to invent it.",
      author: "Alan Kay",
      source: 'fallback' 
    });
  }
}
