// /api/models.js
import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ status: 'error', message: 'API Key missing' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // In the new SDK, list() returns an async generator
    const modelIterator = await ai.models.list();
    
    const allModels = [];

    // Correct way to consume the list in @google/genai
    for await (const m of modelIterator) {
      allModels.push({
        id: m.name.replace('models/', ''),
        displayName: m.displayName,
        inputLimit: m.inputTokenLimit,
        outputLimit: m.outputTokenLimit,
        // Check for Gemini 3 / 2.5 specific features
        isLatest: m.name.includes('gemini-3') || m.name.includes('2.5'),
        supportsThinking: m.thinking || false,
        capabilities: m.supportedGenerationMethods || []
      });
    }

    return res.status(200).json({
      status: 'success',
      sdk: "@google/genai (v1.34.0)",
      total: allModels.length,
      models: allModels
    });

  } catch (error) {
    return res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
}