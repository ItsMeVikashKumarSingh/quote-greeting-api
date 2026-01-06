// /api/models.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ error: 'GEMINI_API_KEY is missing' });
  }

  try {
    // Standard import for the library you are using
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);

    // FIX: In the standard SDK, listModels() is called directly on the genAI instance.
    // If it still fails, your version might be very old (pre-1.5).
    const result = await genAI.listModels();
    
    const workingModels = [];
    const availableIDs = [];

    // The result usually contains an array in 'models'
    for (const m of result.models) {
      const modelId = m.name.replace('models/', '');
      
      availableIDs.push({
        id: modelId,
        displayName: m.displayName,
        description: m.description,
        inputLimit: m.inputTokenLimit,
        methods: m.supportedGenerationMethods
      });

      // Filter for text generation models to show which ones "work"
      if (m.supportedGenerationMethods.includes('generateContent')) {
        workingModels.push(modelId);
      }
    }

    return res.status(200).json({
      status: 'success',
      totalFound: availableIDs.length,
      workingTextModels: workingModels,
      allModelMetadata: availableIDs
    });

  } catch (error) {
    return res.status(500).json({ 
      status: 'error', 
      message: error.message,
      tip: "If listModels is missing, try: npm install @google/generative-ai@latest" 
    });
  }
}