const { GoogleGenerativeAI } = require('@google/generative-ai');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const models = await genAI.getGenerativeModels();
    
    const available = models.map(m => ({
      id: m.name,
      displayName: m.displayName,
      supportedGenerationMethods: m.supportedGenerationMethods
    }));
    
    res.status(200).json({
      availableModels: available,
      recommended: available.filter(m => 
        m.id.includes('flash') || m.id.includes('pro')
      )
    });
  } catch (error) {
    res.status(500).json({ error: error.message, models: [] });
  }
}
