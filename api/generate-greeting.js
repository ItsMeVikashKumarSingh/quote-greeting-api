const { GoogleGenerativeAI } = require('@google/generative-ai');

export default function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  
  genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    .then(model => model.generateContent('Friendly morning greeting'))
    .then(result => result.response.text())
    .then(text => res.end(JSON.stringify({ greeting: text.trim() })))
    .catch(() => res.end(JSON.stringify({ greeting: 'Hello!' })));
}
