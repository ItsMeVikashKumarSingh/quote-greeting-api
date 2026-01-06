// /api/models.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const apiKeyStatus = !!process.env.GEMINI_API_KEY ? 'valid' : 'missing';

  if (apiKeyStatus === 'missing') {
    return res.status(200).json({
      status: 'no_api_key',
      apiKeyStatus,
      workingModels: [],
      testedModels: [],
      error: 'GEMINI_API_KEY is not set'
    });
  }

  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Add/adjust models here as needed
    const testModels = [
      'gemini-2.5-flash',
      'gemini-2.0-flash-exp',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-pro',            // classic Gemini Pro
      'gemini-1.5-pro',
      'gemini-1.0-pro-vision-latest'
    ];

    const workingModels = [];
    const failedModels = [];

    for (const modelName of testModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });

        // Minimal, cheap test prompt
        const result = await model.generateContent('test');
        const text = result.response.text?.() || '';

        workingModels.push({
          name: modelName,
          status: 'working',
          responseLength: text.length
        });
      } catch (error) {
        console.log(`Model ${modelName} failed:`, error.message);
        failedModels.push({
          name: modelName,
          status: 'failed',
          error: error.message
        });
      }
    }

    return res.status(200).json({
      status: workingModels.length > 0 ? 'some_working' : 'no_models',
      apiKeyStatus,
      workingModels,
      failedModels,
      testedModels: testModels
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      apiKeyStatus,
      error: error.message
    });
  }
}
