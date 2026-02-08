
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

    // Determine the visual direction based on user input or default
    const userVisualDirection = data.description && data.description.trim() !== ''
      ? data.description
      : "Chá»¥p cáº­n cáº£nh sáº£n pháº©m 3D (Packshot) cháº¥t lÆ°á»£ng cao, Äáº·t trÃªn bá»¥c trÆ°ng bÃ y sang trá»ng, Ã¡nh sÃ¡ng studio.";

    const promptInput = `
    Vai trÃ²: GiÃ¡m Äá»c sÃ¡ng táº¡o chuyÃªn nghiá»p cho quáº£ng cÃ¡o dÆ°á»£c pháº©m cao cáº¥p.
    Nhiá»m vá»¥: Viáº¿t má»t mÃ´ táº£ chi tiáº¿t (prompt) báº±ng TIáº¾NG VIá»T Äá» táº¡o poster quáº£ng cÃ¡o thuá»c chuyÃªn nghiá»p cho cÃ´ng cá»¥ táº¡o áº£nh AI.

    --- THÃNG TIN QUAN TRá»NG Tá»ª NGÆ¯á»I DÃNG ---
    Ã TÆ¯á»NG HÃNH áº¢NH Cá»T LÃI: "${userVisualDirection}"
    (HÃ£y bÃ¡m sÃ¡t Ã½ tÆ°á»ng nÃ y. Náº¿u ngÆ°á»i dÃ¹ng yÃªu cáº§u DÆ°á»£c SÄ©, hÃ£y mÃ´ táº£ ngÆ°á»i DÆ°á»£c SÄ©. Náº¿u yÃªu cáº§u Packshot 3D, hÃ£y mÃ´ táº£ sáº£n pháº©m 3D).

    --- Äá»NH HÆ¯á»NG Ká»¸ THUáº¬T ---
    - KÃ­ch thÆ°á»c: Poster Khá» Dá»c (Portrait).
    - Phong cÃ¡ch: ChÃ¢n thá»±c nhÆ° áº£nh chá»¥p (Photorealistic), 8k, chi tiáº¿t cao.

    --- Ná»I DUNG VÄN Báº¢N TRÃN POSTER (TEXT ELEMENTS) ---
    YÃªu cáº§u AI váº½ cÃ¡c dÃ²ng chá»¯ sau lÃªn áº£nh (náº¿u cÃ´ng cá»¥ há» trá»£ render text):
    1. TÃªn sáº£n pháº©m: "${data.name}"
    2. GiÃ¡ khuyáº¿n mÃ£i (Ná»i báº­t nháº¥t): "GÃ­a mua tá»« IDECO chá»: ${data.idecoPrice}"
    3. GiÃ¡ niÃªm yáº¿t (Nhá» hÆ¡n): "GÃ­a NiÃªm Yáº¿t: ${data.listPrice}"
    4. NhÃ  sáº£n xuáº¥t: "NhÃ  sáº£n xuáº¥t: ${data.manufacturer}"
    5. ThÃ´ng tin khÃ¡c: ${data.dosage}, ${data.usage}

    --- HÆ¯á»NG DáºªN CHI TIáº¾T CHO AI Váº¼ áº¢NH ---
    1. Bá» Cá»¤C: 
       - Náº¿u lÃ  "DÆ°á»£c sÄ©": MÃ´ táº£ má»t dÆ°á»£c sÄ© (Nam hoáº·c Ná»¯ tÃ¹y theo Ã TÆ¯á»NG Cá»T LÃI á» trÃªn) máº·c Ã¡o blouse tráº¯ng, ngoáº¡i hÃ¬nh tin cáº­y, chuyÃªn nghiá»p, Äang cáº§m sáº£n pháº©m thuá»c trÃªn tay hoáº·c Äá»©ng bÃªn cáº¡nh sáº£n pháº©m phÃ³ng to.
       - Náº¿u lÃ  "Packshot": Sáº£n pháº©m lÃ  nhÃ¢n váº­t chÃ­nh, Äáº·t giá»¯a trung tÃ¢m, Ã¡nh sÃ¡ng ká»ch tÃ­nh (rembrandt lighting).
    
    2. HIá»N THá» GIÃ: 
       - MÃ´ táº£ má»t huy hiá»u (badge) hoáº·c tháº» giÃ¡ thiáº¿t káº¿ sang trá»ng, hiá»n Äáº¡i náº±m á» vá» trÃ­ dá» nhÃ¬n (vÃ­ dá»¥: gÃ³c dÆ°á»i hoáº·c treo lÆ¡ lá»­ng) chá»©a ná»i dung giÃ¡.

    3. KHÃNG GIAN: 
       - NhÃ  thuá»c tÃ¢y hiá»n Äáº¡i, sáº¡ch sáº½, tÃ´ng mÃ u tráº¯ng/xanh y táº¿ hoáº·c mÃ u nháº­n diá»n cá»§a thÆ°Æ¡ng hiá»u thuá»c.

    4. PHÃP LÃ: 
       - ${data.isETC ? 'CÃ³ con dáº¥u Äá» hoáº·c nhÃ£n cáº£nh bÃ¡o "THUá»C KÃ TOA" á» gÃ³c poster.' : ''}

    Äáº¦U RA YÃU Cáº¦U:
    Chá» tráº£ vá» Äoáº¡n vÄn mÃ´ táº£ (prompt) hoÃ n chá»nh báº±ng TIáº¾NG VIá»T. KhÃ´ng thÃªm lá»i dáº«n, khÃ´ng giáº£i thÃ­ch.
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
