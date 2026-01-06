import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).send('Method not allowed');
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 200,
      }
    });
    
    const prompt = `Generate a single inspirational quote in EXACTLY this format:
<quote>"[quote text here]"
<author>[author name]

Examples:
<quote>"Don't cry because it's over, smile because it happened."
<author>Dr. Seuss

<quote>"Two things are infinite: the universe and human stupidity; and I'm not sure about the universe."
<author>Albert Einstein

Generate ONE unique quote in this exact format. Return ONLY the formatted quote with no extra text, markdown, or code blocks.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();
    
    // Clean up response
    text = text.replace(/```[a-z]*\n?/g, '').trim();
    text = text.replace(/^\s*[\r\n]/gm, '');
    
    return res.status(200).send(text);
    
  } catch (error) {
    console.error('Error generating quote:', error);
    return res.status(500).send('<quote>"The best way to predict the future is to create it."\n<author>Peter Drucker');
  }
}
