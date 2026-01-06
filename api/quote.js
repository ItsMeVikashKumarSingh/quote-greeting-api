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
      model: 'gemini-2.5-flash'
    });

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: `Generate ONE inspirational quote in this format:
<quote>"Quote text here"
<author>Author Name

Return ONLY the quote.`
        }]
      }]
    });

    const text = result.response.text().trim();
    res.status(200).setHeader('Cache-Control', 's-maxage=300').send(text);
    
  } catch (error) {
    console.error('QUOTE_ERROR:', error.message);
    res.status(200).send('<quote>"The only way to do great work is to love what you do."\n<author>Steve Jobs');
  }
}
