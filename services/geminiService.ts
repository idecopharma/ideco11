
import { GoogleGenAI } from "@google/genai";
import { ProductData } from "../types";

/**
 * Generates an optimized image generation prompt based on product data and an optional image.
 * Uses gemini-2.5-flash for multimodal understanding (Image + Text -> Text).
 */
export const generateOptimizedPrompt = async (data: ProductData): Promise<string> => {
  // Initialize inside function to ensure we use the current environment variable
  // and prevent module-level initialization errors if the key is missing on load.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const parts: any[] = [];

    // 1. Add the image if it exists (Multimodal input)
    if (data.imageBase64 && data.mimeType) {
      // Remove header if present (e.g., "data:image/jpeg;base64,")
      const base64Data = data.imageBase64.split(',')[1];
      
      parts.push({
        inlineData: {
          mimeType: data.mimeType,
          data: base64Data
        }
      });
    }

    // 2. Add the text instructions
    const promptInput = `
    Role: You are an expert AI Prompt Engineer specializing in high-end pharmaceutical advertising for the "Google Banana Pro" (Gemini Image 3) model.
    
    Task: Write a single, highly detailed English text-to-image prompt.

    INPUT DATA:
    - Product Name: ${data.name}
    - Dosage: ${data.dosage}
    - Usage/Indication: ${data.usage}
    - Type: ${data.isETC ? "Prescription Drug (ETC)" : "OTC"}
    - List Price: ${data.listPrice}
    - IDECO Price: ${data.idecoPrice}
    - Manufacturer: ${data.manufacturer}
    - Extra Context: ${data.description || "N/A"}
    - Layout/Orientation: ${data.aspectRatio === 'vertical' ? 'Vertical (9:16 Aspect Ratio)' : 'Horizontal (16:9 Aspect Ratio)'}
    ${data.imageBase64 ? "- IMAGE PROVIDED: Yes. (Analyze the attached image for bottle shape, box color, and packaging texture. The generated image MUST look like this product.)" : "- IMAGE PROVIDED: No. (Hallucinate a professional, generic pharmaceutical design.)"}

    PROMPT STRUCTURE RULES:
    1. **Visual Description**: Describe the product appearing on a podium or in a clean, high-end medical studio setting. Lighting should be cinematic, soft, and professional (8k resolution, photorealistic).
       - COMPOSITION: STRICTLY generate a ${data.aspectRatio === 'vertical' ? 'VERTICAL (Tall)' : 'HORIZONTAL (Wide)'} image composition.
    
    2. **Text Overlays (CRITICAL - TYPOGRAPHY RULES)**: 
       You MUST command the model to render text with specific styles. The goal is to sell the product immediately:
       
       - **Title 1 (THE HERO - Product Name):** "${data.name} ${data.dosage}"
         -> **INSTRUCTION:** ${data.imageBase64 ? 
            `**BRAND IDENTITY MATCH:** Analyze the uploaded product image carefully. Identify the **dominant color** and **font style** (e.g., Serif, Sans, Script) of the product name printed on the actual packaging. RENDER Title 1 in **Massive 3D Typography** using that **EXACT COLOR** and style. (e.g., If the box text is Navy Blue, describe this title as 'Glossy Navy Blue 3D Text'; if Gold Foil, describe as 'Gold Foil 3D Text').` 
            : 
            `Render this text in **MASSIVE, LUXURIOUS, 3D TYPOGRAPHY**. Use a modern, thick font with a glossy, metallic, or crystal finish. It needs to look expensive and impressive.`}
       
       - **Subtitle:** "${data.usage}"
         -> **INSTRUCTION:** Clean, crisp sans-serif font. Readable and professional.
       
       - **Title 2 (List Price):** "Giá niêm yết: ${data.listPrice}"
         -> **INSTRUCTION:** Use a neutral color (grey/silver) or a thin font weight. It should be visible but NOT the main focus.
       
       - **Title 3 (THE DEAL SEAL - IDECO Price):** "Giá mua từ IDECO chỉ: ${data.idecoPrice}"
         -> **INSTRUCTION:** This must be the **MOST ATTRACTIVE** element. 
            *   Make the text **SIGNIFICANTLY LARGER** than the List Price.
            *   Use **VIBRANT COLORS** like Bright Red, Deep Gold, or Neon Green to contrast heavily with the background.
            *   Style it like a "Special Offer" badge or a high-impact price tag.
            *   **Emphasize the numbers** to make the price look like a steal.
       
       - **Title 4 (Footer Anchor):** "Sản xuất bởi: ${data.manufacturer}" 
         -> **INSTRUCTION:** STRICTLY PLACE THIS TEXT AT THE VERY BOTTOM EDGE (Footer Area) of the poster. Use small, discrete, professional sans-serif font. It must be separated from the main content.
       
       ${data.isETC ? '- **Compliance Label:** Add small text in top corner: "Thuốc kê toa" (Red warning color, distinct).' : ''}

    3. **Style**: Commercial photography, macro lens details, high dynamic range, trust-inspiring atmosphere.

    OUTPUT:
    Return ONLY the prompt string. Do not include labels like "Here is the prompt:".
    `;

    parts.push({ text: promptInput });

    // Explicitly wrapping in an array of contents for maximum compatibility
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: [{ role: 'user', parts: parts }],
      config: {
        temperature: 0.7,
      }
    });

    if (!response.text) {
        throw new Error("API returned empty text.");
    }

    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    // Throwing error so the UI can catch it and display the message
    throw error; 
  }
};
