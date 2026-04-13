// Dummy script to test Gemini API integration directly
const axios = require('axios');
require('dotenv').config();

const geminiApiKey = process.env.GEMINI_API_KEY;
console.log('Gemini API Key:', geminiApiKey ? 'Loaded' : 'Not found');
const geminiBaseUrl = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/models';
const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

async function callGemini(prompt) {
  const trimmedBaseUrl = String(geminiBaseUrl || '').replace(/\/+$/, '');
  const endpoint = trimmedBaseUrl.endsWith('/models')
    ? `${trimmedBaseUrl}/${geminiModel}:generateContent`
    : `${trimmedBaseUrl}/models/${geminiModel}:generateContent`;
  try {
    const response = await axios.post(
      endpoint,
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.15,
          topP: 0.3,
          maxOutputTokens: 120,
        },
      },
      {
        params: { key: geminiApiKey },
        headers: { 'Content-Type': 'application/json' },
        timeout: 20000,
      }
    );
    const parts = response.data?.candidates?.[0]?.content?.parts;
    const text = Array.isArray(parts) ? parts.map(p => p.text).join('\n') : '';
    console.log('Gemini response:', text || response.data);
  } catch (err) {
    console.error('Gemini API error:', err.response?.data || err.message);
  }
}

const prompt = process.argv[2] || 'Say hello as a technical interviewer.';
callGemini(prompt);
