const { GoogleGenerativeAI } = require('@google/generative-ai');

export default function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/plain');
  
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  
  genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    .then(model => model.generateContent('Inspirational quote'))
    .then(result => result.response.text())
    .then(text => res.end(text))
    .catch(() => res.end('quote: "Keep going!"\nauthor: You'));
}
