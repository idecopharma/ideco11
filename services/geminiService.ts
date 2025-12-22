
import { GoogleGenAI } from "@google/genai";
import { ProductData } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || 'FAKE_API_KEY_FOR_DEVELOPMENT' });

/**
 * Generates an optimized image generation prompt based on product data.
 */
export const generateOptimizedPrompt = async (data: ProductData): Promise<string> => {
  const ai = getAI();
  try {
    const parts: any[] = [];
    if (data.imageBase64 && data.mimeType) {
      const base64Data = data.imageBase64.split(',')[1];
      parts.push({ inlineData: { mimeType: data.mimeType, data: base64Data } });
    }

    const promptInput = `
    Role: Expert AI Prompt Engineer for pharmaceutical advertising.
    Task: Write a detailed English text-to-image prompt for Gemini Image 3.
    Input: Product ${data.name}, Dosage ${data.dosage}, Usage ${data.usage}, Price ${data.idecoPrice}.
    Orientation: ${data.aspectRatio}.
    Output: Return only the prompt string.
    `;
    parts.push({ text: promptInput });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: [{ role: 'user', parts: parts }],
    });
    return response.text || "";
  } catch (error) {
    throw error;
  }
};

/**
 * Xá»­ lÃ½ hÃ¬nh áº£nh: XÃ³a ná»n hoáº·c Táº¡o há»p 3D
 */
export const processImageWithAI = async (
  imageBase64: string, 
  mimeType: string, 
  task: 'remove_bg' | 'make_3d'
): Promise<string> => {
  const ai = getAI();
  const base64Data = imageBase64.split(',')[1];
  
  const prompts = {
    remove_bg: "Please remove the background of this pharmaceutical product perfectly. Output only the product on a pure white background. Keep all text and details on the package intact.",
    make_3d: "Transform this 2D pharmaceutical label or product photo into a high-quality professional 3D medicine box standing on a clean surface. Realistic shadows, cinematic medical studio lighting, 8k resolution."
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: prompts[task] }
        ]
      }
    });

    for (const part of response.candidates?.[0].content.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("KhÃ´ng nháº­n ÄÆ°á»£c dá»¯ liá»u hÃ¬nh áº£nh tá»« AI.");
  } catch (error) {
    console.error("Image Processing Error:", error);
    throw error;
  }
};
