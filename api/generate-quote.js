const { GoogleGenerativeAI } = require('@google/generative-ai');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/plain');
  
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `Generate ONE inspirational quote in this format:
<quote>"Quote text"
<author>Author Name`;
    
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    res.status(200).send(text.trim());
  } catch (error) {
    console.error(error);
    res.status(200).send('<quote>"Success is not final."\n<author>Winston Churchill');
  }
}
