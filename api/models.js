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
    // New 2026 SDK Client initialization
    const ai = new GoogleGenAI({ apiKey });

    // In @google/genai, we use ai.models.list()
    const response = await ai.models.list();
    
    // Formatting the output for your test dashboard
    const formattedModels = response.models.map(m => ({
      id: m.name.replace('models/', ''),
      name: m.displayName,
      inputLimit: m.inputTokenLimit,
      // Check for Gemini 3 specific 'Thinking' capability
      thinking: m.supportedGenerationMethods.includes('generateContent') && 
                (m.name.includes('gemini-3') || m.name.includes('2.5')),
      capabilities: m.supportedGenerationMethods
    }));

    return res.status(200).json({
      status: 'success',
      sdk: "@google/genai (v1.34.0)",
      total: formattedModels.length,
      models: formattedModels
    });

  } catch (error) {
    return res.status(500).json({ 
      status: 'error', 
      message: error.message,
      stack: "Check if GEMINI_API_KEY is restricted to specific models in AI Studio."
    });
  }
}