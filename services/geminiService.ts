
import { GoogleGenAI } from "@google/genai";
import { ProductData } from "../types";

/**
 * Generates an optimized image generation prompt based on product data.
 * FORCED: Vertical layout and specific price information.
 */
export const generateOptimizedPrompt = async (data: ProductData): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || 'FAKE_API_KEY_FOR_DEVELOPMENT' });

  try {
    const parts: any[] = [];

    // Attach product image if available for reference
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
    Role: Professional Creative Director for High-End Pharmaceutical Advertising.
    Task: Create a highly detailed English prompt for an AI image generator (like Midjourney or Stable Diffusion) to create a professional medical poster.

    MANDATORY ORIENTATION:
    - This MUST be a **Vertical Poster** (Portrait orientation). Describe the composition for a tall frame.

    MANDATORY TEXT ELEMENTS TO BE DESCRIBED IN THE POSTER:
    - Main Product Title: "${data.name}"
    - List Price Tag: "GÃÂ­a NiÃÂªm YÃ¡ÂºÂ¿t: ${data.listPrice}"
    - Special Offer Tag: "GÃÂ­a mua tÃ¡Â»Â« IDECO chÃ¡Â»Â: ${data.idecoPrice}"
    - Manufacturer Info: "NhÃÂ  sÃ¡ÂºÂ£n xuÃ¡ÂºÂ¥t: ${data.manufacturer}"
    - Other Details: ${data.dosage}, ${data.usage}

    VISUAL EXECUTION REQUIREMENTS:
    1. STYLE: Photorealistic, 8k resolution, cinematic studio lighting, premium medical aesthetic.
    2. COMPOSITION: Place the product box (modeled after the attached image) as the central focus. 
    3. THE PRICE HERO: Describe a premium, eye-catching 3D UI element or glowing badge that displays "GÃÂ­a mua tÃ¡Â»Â« IDECO chÃ¡Â»Â: ${data.idecoPrice}" in bold, large, attractive typography.
    4. SECONDARY PRICE: Describe the "GÃÂ­a NiÃÂªm YÃ¡ÂºÂ¿t: ${data.listPrice}" text placed subtly but clearly near the main price to show the value.
    5. BRANDING: The background should be a high-end pharmacy, a clean laboratory, or a professional minimalist clinic.
    6. REGULATORY: ${data.isETC ? 'Include a professional red "THUÃ¡Â»ÂC KÃÂ TOA" stamp in the corner.' : ''}
    
    IMPORTANT: Do not mention "9:16" or "16:9". Simply describe it as a "Vertical Poster" and ensure all price details above are integrated into the visual description.
    
    OUTPUT: Return only the final English prompt text. No conversational filler.
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || 'FAKE_API_KEY_FOR_DEVELOPMENT' });
  const data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
  
  const prompts = {
    'remove-bg': "Remove the background completely and professionally. Keep only the medical product on a pure white background. Preserve all label text perfectly.",
    'make-3d': "Transform this flat product photo into a high-quality 3D packshot render. Realistic perspective, soft shadows, standing on a clean reflective surface."
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
