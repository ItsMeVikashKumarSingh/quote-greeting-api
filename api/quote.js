const { GoogleGenerativeAI } = require('@google/generative-ai');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('X-API-Version', '1.0.0');
  
  if (req.method !== 'GET') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('API_KEY_MISSING');
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 100
      }
    });

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: `Generate ONE inspirational quote EXACTLY like:
<quote>"Don't cry because it's over, smile because it happened."
<author>Dr. Seuss

Return ONLY the formatted quote.`
        }]
      }]
    });

    const text = result.response.text().trim();
    res.status(200).setHeader('Cache-Control', 's-maxage=300').send(text);
    
  } catch (error) {
    console.error('QUOTE_ERROR:', error.message);
    res.status(200).send('<quote>"Production systems must always respond."\n<author>DevOps');
  }
}
