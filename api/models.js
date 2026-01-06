export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Test common models with try-catch
    const testModels = [
      'gemini-2.5-flash',
      'gemini-1.5-flash',
      'gemini-pro',
      'gemini-1.5-pro',
      'gemini-1.0-pro-vision-latest'
    ];
    
    const workingModels = [];
    
    for (const modelName of testModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        // Test generation
        const result = await model.generateContent('test');
        workingModels.push({
          name: modelName,
          status: 'working',
          responseLength: result.response.text().length
        });
        break; // Found one working model
      } catch (error) {
        console.log(`Model ${modelName}:`, error.message);
      }
    }
    
    res.status(200).json({
      workingModels,
      testedModels: testModels,
      status: workingModels.length > 0 ? 'ready' : 'no_models',
      apiKeyStatus: !!process.env.GEMINI_API_KEY ? 'valid' : 'missing'
    });
    
  } catch (error) {
    res.status(500).json({
      error: error.message,
      status: 'error'
    });
  }
}
