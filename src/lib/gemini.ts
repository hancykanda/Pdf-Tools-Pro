import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('GEMINI_API_KEY is not set');
}

const genAI = new GoogleGenerativeAI(apiKey);

export function getGenerativeModel(modelName = 'gemini-2.0-flash') {
  return genAI.getGenerativeModel({ model: modelName });
}

export async function generateWithGemini(
  prompt: string,
  files?: { mimeType: string; data: string }[]
) {
  const model = getGenerativeModel();
  const parts: (string | { inlineData: { mimeType: string; data: string } })[] = files
    ? files.map((file) => ({ inlineData: file }))
    : [];

  parts.unshift(prompt);

  const result = await model.generateContent(parts);
  const response = await result.response;
  return response.text();
}
