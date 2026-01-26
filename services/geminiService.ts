
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
    Vai trÃ²: GiÃ¡m Äá»c sÃ¡ng táº¡o chuyÃªn nghiá»p cho quáº£ng cÃ¡o dÆ°á»£c pháº©m cao cáº¥p.
    Nhiá»m vá»¥: Viáº¿t má»t mÃ´ táº£ chi tiáº¿t (prompt) báº±ng TIáº¾NG VIá»T Äá» táº¡o poster quáº£ng cÃ¡o thuá»c chuyÃªn nghiá»p cho cÃ´ng cá»¥ táº¡o áº£nh AI.

    Äá»NH HÆ¯á»NG Báº®T BUá»C:
    - ÄÃ¢y PHáº¢I lÃ  **Poster Khá» Dá»c** (Portrait orientation). MÃ´ táº£ bá» cá»¥c cho khung hÃ¬nh cao.

    CÃC THÃNH PHáº¦N VÄN Báº¢N Báº®T BUá»C PHáº¢I MÃ Táº¢ TRONG POSTER:
    - TÃªn sáº£n pháº©m chÃ­nh: "${data.name}"
    - GiÃ¡ niÃªm yáº¿t: "GÃ­a NiÃªm Yáº¿t: ${data.listPrice}"
    - GiÃ¡ khuyáº¿n mÃ£i: "GÃ­a mua tá»« IDECO chá»: ${data.idecoPrice}"
    - NhÃ  sáº£n xuáº¥t: "NhÃ  sáº£n xuáº¥t: ${data.manufacturer}"
    - Chi tiáº¿t khÃ¡c: ${data.dosage}, ${data.usage}

    YÃU Cáº¦U THá»°C THI HÃNH áº¢NH:
    1. PHONG CÃCH: ChÃ¢n thá»±c nhÆ° áº£nh chá»¥p (Photorealistic), Äá» phÃ¢n giáº£i 8k, Ã¡nh sÃ¡ng studio Äiá»n áº£nh, tháº©m má»¹ y táº¿ cao cáº¥p.
    2. Bá» Cá»¤C: Äáº·t há»p thuá»c (dá»±a trÃªn hÃ¬nh áº£nh ÄÃ­nh kÃ¨m) lÃ m tÃ¢m Äiá»m chÃ­nh. 
    3. ÄIá»M NHáº¤N Vá» GIÃ: MÃ´ táº£ má»t yáº¿u tá» UI 3D sang trá»ng hoáº·c huy hiá»u phÃ¡t sÃ¡ng hiá»n thá» "GÃ­a mua tá»« IDECO chá»: ${data.idecoPrice}" vá»i kiá»u chá»¯ Äáº­m, lá»n, háº¥p dáº«n.
    4. GIÃ PHá»¤: MÃ´ táº£ dÃ²ng chá»¯ "GÃ­a NiÃªm Yáº¿t: ${data.listPrice}" ÄÆ°á»£c Äáº·t tinh táº¿ nhÆ°ng rÃµ rÃ ng gáº§n giÃ¡ chÃ­nh Äá» thá» hiá»n giÃ¡ trá» so sÃ¡nh.
    5. THÆ¯Æ NG HIá»U: Ná»n nÃªn lÃ  má»t nhÃ  thuá»c cao cáº¥p, phÃ²ng thÃ­ nghiá»m sáº¡ch sáº½, hoáº·c phÃ²ng khÃ¡m tá»i giáº£n chuyÃªn nghiá»p.
    6. PHÃP LÃ: ${data.isETC ? 'Bao gá»m con dáº¥u Äá» chuyÃªn nghiá»p "THUá»C KÃ TOA" á» gÃ³c.' : ''}
    
    QUAN TRá»NG: KhÃ´ng nháº¯c Äáº¿n "9:16" hay "16:9". Chá» mÃ´ táº£ ÄÆ¡n giáº£n lÃ  "Poster Khá» Dá»c" vÃ  Äáº£m báº£o táº¥t cáº£ chi tiáº¿t giÃ¡ cáº£ á» trÃªn ÄÆ°á»£c tÃ­ch há»£p vÃ o mÃ´ táº£ hÃ¬nh áº£nh.
    
    Äáº¦U RA: Chá» tráº£ vá» vÄn báº£n prompt cuá»i cÃ¹ng báº±ng TIáº¾NG VIá»T. KhÃ´ng thÃªm lá»i dáº«n chuyá»n.
    `;

    parts.push({ text: promptInput });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: [{ role: 'user', parts: parts }]
    });

    return response.text || "KhÃ´ng thá» táº¡o prompt.";
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
