
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

    const promptInput = `
    Vai trò: Giám đốc sáng tạo chuyên nghiệp cho quảng cáo dược phẩm cao cấp.
    Nhiệm vụ: Viết một mô tả chi tiết (prompt) bằng TIẾNG VIỆT để tạo poster quảng cáo thuốc chuyên nghiệp cho công cụ tạo ảnh AI.

    ĐỊNH HƯỚNG BẮT BUỘC:
    - Đây PHẢI là **Poster Khổ Dọc** (Portrait orientation). Mô tả bố cục cho khung hình cao.

    CÁC THÀNH PHẦN VĂN BẢN BẮT BUỘC PHẢI MÔ TẢ TRONG POSTER:
    - Tên sản phẩm chính: "${data.name}"
    - Giá niêm yết: "Gía Niêm Yết: ${data.listPrice}"
    - Giá khuyến mãi: "Gía mua từ IDECO chỉ: ${data.idecoPrice}"
    - Nhà sản xuất: "Nhà sản xuất: ${data.manufacturer}"
    - Chi tiết khác: ${data.dosage}, ${data.usage}

    YÊU CẦU THỰC THI HÌNH ẢNH:
    1. PHONG CÁCH: Chân thực như ảnh chụp (Photorealistic), độ phân giải 8k, ánh sáng studio điện ảnh, thẩm mỹ y tế cao cấp.
    2. BỐ CỤC: Đặt hộp thuốc (dựa trên hình ảnh đính kèm) làm tâm điểm chính. 
    3. ĐIỂM NHẤN VỀ GIÁ: Mô tả một yếu tố UI 3D sang trọng hoặc huy hiệu phát sáng hiển thị "Gía mua từ IDECO chỉ: ${data.idecoPrice}" với kiểu chữ đậm, lớn, hấp dẫn.
    4. GIÁ PHỤ: Mô tả dòng chữ "Gía Niêm Yết: ${data.listPrice}" được đặt tinh tế nhưng rõ ràng gần giá chính để thể hiện giá trị so sánh.
    5. THƯƠNG HIỆU: Nền nên là một nhà thuốc cao cấp, phòng thí nghiệm sạch sẽ, hoặc phòng khám tối giản chuyên nghiệp.
    6. PHÁP LÝ: ${data.isETC ? 'Bao gồm con dấu đỏ chuyên nghiệp "THUỐC KÊ TOA" ở góc.' : ''}
    
    QUAN TRỌNG: Không nhắc đến "9:16" hay "16:9". Chỉ mô tả đơn giản là "Poster Khổ Dọc" và đảm bảo tất cả chi tiết giá cả ở trên được tích hợp vào mô tả hình ảnh.
    
    ĐẦU RA: Chỉ trả về văn bản prompt cuối cùng bằng TIẾNG VIỆT. Không thêm lời dẫn chuyện.
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
