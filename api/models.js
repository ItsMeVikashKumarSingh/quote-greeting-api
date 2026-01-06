// /api/models.js
import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  // ESM doesn't need 'use strict' or specific wrapper logic for Vercel headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ status: 'error', message: 'API Key missing' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // The new SDK method to list models
    const response = await ai.models.list();
    
    const formattedModels = response.models.map(m => ({
      id: m.name.replace('models/', ''),
      name: m.displayName,
      inputLimit: m.inputTokenLimit,
      // Flash 3 and Pro 3 logic
      isLatest: m.name.includes('gemini-3') || m.name.includes('2.5'),
      capabilities: m.supportedGenerationMethods
    }));

    return res.status(200).json({
      status: 'success',
      sdk: "Unified @google/genai",
      models: formattedModels
    });

  } catch (error) {
    return res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
}