// /api/models.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ status: 'error', message: 'API Key missing' });
  }

  try {
    // 1. We hit the REST endpoint directly to bypass the SDK "listModels is not a function" bug
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ status: 'api_error', details: data.error });
    }

    // 2. Format the response for your dashboard/testing
    const formattedModels = data.models.map(m => ({
      id: m.name.split('/').pop(),
      name: m.displayName,
      version: m.version,
      inputLimit: m.inputTokenLimit,
      outputLimit: m.outputTokenLimit,
      supportsThinking: m.thinking || false, // New for Gemini 3
      capabilities: m.supportedGenerationMethods
    }));

    return res.status(200).json({
      status: 'success',
      usage: 'Using Direct REST API (Vercel Optimized)',
      models: formattedModels
    });

  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
}