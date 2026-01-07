
import { GoogleGenAI } from "@google/genai";
import { ProductData } from "../types";

/**
 * Generates an optimized image generation prompt based on product data.
 */
export const generateOptimizedPrompt = async (data: ProductData): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const parts: any[] = [];

    if (data.imageBase64 && data.mimeType) {
      const base64Data = data.imageBase64.split(',')[1];
      parts.push({
        inlineData: {
          mimeType: data.mimeType,
          data: base64Data
        }
      });
    }

    const promptInput = `
    Role: Master Creative Director for Pharmaceutical Advertising.
    Task: Create a masterpiece text-to-image prompt for a professional medical poster.

    DATA INPUTS (RENDER EXACTLY AS WRITTEN):
    - Title 1 (Product Name): "${data.name}"
    - Title 2 (List Price): "${data.listPrice}"
    - Title 3 (SPECIAL IDECO PRICE): "${data.idecoPrice}"
    - Title 4 (Manufacturer): "Nhà sản xuất bởi: ${data.manufacturer}"
    - Detail: ${data.dosage} | ${data.usage}
    - Regulatory: ${data.isETC ? 'THUỐC KÊ TOA (REQUIRED)' : 'NONE'}

    CRITICAL VISUAL HIERARCHY:
    1. BRANDING: Analyze the attached image. Render the product box exactly as shown. Use massive 3D typography for "${data.name}" at the top.
    2. UNDISPUTED CENTERPIECE (IDECO PRICE): The text "${data.idecoPrice}" must be the biggest and most attractive element. Render it in a vibrant 3D glowing neon or liquid gold style. Place it inside a premium floating glass badge or high-end promotional ribbon. It MUST stand out as the hero of the poster.
    3. PRICE COMPARISON: Place the list price "${data.listPrice}" nearby but in a significantly smaller, clean, elegant font to show contrast.
    4. MANDATORY BADGE: ${data.isETC ? 'In the top-left corner, place a professional red rectangular stamp with bold white text "Thuốc kê toa".' : ''}
    5. FOOTER: "Nhà sản xuất bởi: ${data.manufacturer}" must be placed cleanly at the bottom edge.

    ARTISTIC SETTING:
    - Environment: Minimalist luxury pharmacy or a high-tech medicine lab.
    - Lighting: Volumetric studio lighting, soft shadows, sharp focus on product.
    - Quality: 8k resolution, photorealistic render, cinematic bokeh background.
    - Format: ${data.aspectRatio === 'vertical' ? '9:16 Portrait' : '16:9 Landscape'}.

    OUTPUT: Only return the English image generation prompt. No introduction or notes.
    `;

    parts.push({ text: promptInput });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: [{ role: 'user', parts: parts }]
    });

    return response.text || "Failed to generate prompt.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error; 
  }
};

/**
 * Processes a product image using Gemini 2.5 Flash Image.
 */
export const processProductImageAI = async (
  base64Image: string, 
  mimeType: string, 
  task: 'remove-bg' | 'make-3d'
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
  
  const prompts = {
    'remove-bg': "Remove the background. Keep only the product on pure white. Do not alter labels.",
    'make-3d': "Transform this product photo into a professional 3D packshot on a clean surface."
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data, mimeType } },
          { text: prompts[task] }
        ]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("AI did not return an image.");
  } catch (error) {
    console.error("Image Processing Error:", error);
    throw error;
  }
};
