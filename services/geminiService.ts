
import { GoogleGenAI } from "@google/genai";
import { ProductData } from "../types";

/**
 * Generates an optimized image generation prompt based on product data.
 * FORCED: Vertical layout and specific price information.
 */
export const generateOptimizedPrompt = async (data: ProductData): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
      : "Chụp cận cảnh sản phẩm 3D (Packshot) chất lượng cao, đặt trên bục trưng bày sang trọng, ánh sáng studio.";

    const promptInput = `
    Vai trò: Giám đốc sáng tạo chuyên nghiệp cho quảng cáo dược phẩm cao cấp.
    Nhiệm vụ: Viết một mô tả chi tiết (prompt) bằng TIẾNG VIỆT để tạo poster quảng cáo thuốc chuyên nghiệp cho công cụ tạo ảnh AI.

    --- THÔNG TIN QUAN TRỌNG TỪ NGƯỜI DÙNG ---
    Ý TƯỞNG HÌNH ẢNH CỐT LÕI: "${userVisualDirection}"
    (Hãy bám sát ý tưởng này. Nếu người dùng yêu cầu Dược Sĩ, hãy mô tả người Dược Sĩ. Nếu yêu cầu Packshot 3D, hãy mô tả sản phẩm 3D).

    --- ĐỊNH HƯỚNG KỸ THUẬT ---
    - Kích thước: Poster Khổ Dọc (Portrait).
    - Phong cách: Chân thực như ảnh chụp (Photorealistic), 8k, chi tiết cao.

    --- NỘI DUNG VĂN BẢN TRÊN POSTER (TEXT ELEMENTS) ---
    Yêu cầu AI vẽ các dòng chữ sau lên ảnh (nếu công cụ hỗ trợ render text):
    1. Tên sản phẩm: "${data.name}"
    2. Giá khuyến mãi (Nổi bật nhất): "Gía mua từ IDECO chỉ: ${data.idecoPrice}"
    3. Giá niêm yết (Nhỏ hơn): "Gía Niêm Yết: ${data.listPrice}"
    4. Nhà sản xuất: "Nhà sản xuất: ${data.manufacturer}"
    5. Thông tin khác: ${data.dosage}, ${data.usage}

    --- HƯỚNG DẪN CHI TIẾT CHO AI VẼ ẢNH ---
    1. BỐ CỤC: 
       - Nếu là "Dược sĩ": Mô tả một dược sĩ (Nam hoặc Nữ tùy theo Ý TƯỞNG CỐT LÕI ở trên) mặc áo blouse trắng, ngoại hình tin cậy, chuyên nghiệp, đang cầm sản phẩm thuốc trên tay hoặc đứng bên cạnh sản phẩm phóng to.
       - Nếu là "Packshot": Sản phẩm là nhân vật chính, đặt giữa trung tâm, ánh sáng kịch tính (rembrandt lighting).
    
    2. HIỂN THỊ GIÁ: 
       - Mô tả một huy hiệu (badge) hoặc thẻ giá thiết kế sang trọng, hiện đại nằm ở vị trí dễ nhìn (ví dụ: góc dưới hoặc treo lơ lửng) chứa nội dung giá.

    3. KHÔNG GIAN: 
       - Nhà thuốc tây hiện đại, sạch sẽ, tông màu trắng/xanh y tế hoặc màu nhận diện của thương hiệu thuốc.

    4. PHÁP LÝ: 
       - ${data.isETC ? 'Có con dấu đỏ hoặc nhãn cảnh báo "THUỐC KÊ TOA" ở góc poster.' : ''}

    ĐẦU RA YÊU CẦU:
    Chỉ trả về đoạn văn mô tả (prompt) hoàn chỉnh bằng TIẾNG VIỆT. Không thêm lời dẫn, không giải thích.
    `;

    parts.push({ text: promptInput });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: [{ role: 'user', parts: parts }]
    });

    return response.text || "Không thể tạo prompt.";
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
