// /api/models.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      status: 'no_api_key',
      error: 'GEMINI_API_KEY is missing from environment variables'
    });
  }

  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);

    // 1. DYNAMICALLY FETCH MODELS: This is the most important change.
    // This returns only the models YOUR specific key is allowed to use.
    const modelList = await genAI.listModels();
    
    const workingModels = [];
    const failedModels = [];

    // 2. Filter for models that actually support text generation
    const validTestCandidates = modelList.models.filter(m => 
      m.supportedGenerationMethods.includes('generateContent')
    );

    // 3. Test a few flagship ones (or all) to check for Quota/429 issues
    for (const modelInfo of validTestCandidates) {
      // Clean the name (sometimes comes as 'models/gemini-pro')
      const modelId = modelInfo.name.replace('models/', '');
      
      try {
        const model = genAI.getGenerativeModel({ model: modelId });
        
        // We use a very short prompt to save quota
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
          generationConfig: { maxOutputTokens: 5 } 
        });

        workingModels.push({
          id: modelId,
          displayName: modelInfo.displayName,
          inputLimit: modelInfo.inputTokenLimit,
          outputLimit: modelInfo.outputTokenLimit,
          status: 'active'
        });
      } catch (error) {
        failedModels.push({
          id: modelId,
          error: error.message.includes('429') ? 'Quota Exceeded' : error.message
        });
      }
    }

    return res.status(200).json({
      status: 'success',
      usageTier: workingModels.length > 5 ? 'Paid/Higher' : 'Free/Limited',
      workingModels,
      failedModels
    });

  } catch (error) {
    return res.status(500).json({ status: 'error', error: error.message });
  }
}