
import { GoogleGenAI } from "@google/genai";
import { ProductData } from "../types";

/**
 * Generates an optimized image generation prompt based on product data.
 */
export const generateOptimizedPrompt = async (data: ProductData, customApiKey?: string): Promise<string> => {
  const apiKey = customApiKey || process.env.API_KEY;
  if (!apiKey) throw new Error("Thiếu API Key.");
  const ai = new GoogleGenAI({ apiKey });

  try {
    const parts: any[] = [];

    if (data.imageBase64 && data.mimeType) {
      const base64Data = data.imageBase64.includes(',') ? data.imageBase64.split(',')[1] : data.imageBase64;
      parts.push({
        inlineData: {
          mimeType: data.mimeType,
          data: base64Data
        }
      });
    }

    // Updated instruction to generate prompt in Vietnamese
    const promptInput = `
    Vai trò: Giám đốc sáng tạo (Creative Director) chuyên về quảng cáo dược phẩm.
    Nhiệm vụ: Viết một đoạn mô tả chi tiết (prompt) bằng TIẾNG VIỆT để tạo hình ảnh poster quảng cáo thuốc chuyên nghiệp, ấn tượng.

    DỮ LIỆU ĐẦU VÀO (HIỂN THỊ CHÍNH XÁC TRÊN ẢNH):
    - Tên sản phẩm (Title 1): "${data.name}"
    - Giá niêm yết (Title 2): "${data.listPrice}"
    - GIÁ IDECO (Title 3 - QUAN TRỌNG NHẤT): "GIÁ BÁN TỪ IDECO CHỈ CÒN ĐẾN: ${data.idecoPrice}"
    - Nhà sản xuất (Title 4): "Nhà sản xuất bởi: ${data.manufacturer}"
    - Chi tiết: ${data.dosage} | ${data.usage}
    - Quy định: ${data.isETC ? 'THUỐC KÊ TOA (BẮT BUỘC CÓ KHUNG ĐỎ)' : 'KHÔNG'}

    CẤU TRÚC HÌNH ẢNH YÊU CẦU:
    1. NHẬN DIỆN THƯƠNG HIỆU: Dựa trên ảnh sản phẩm đính kèm (nếu có), hãy mô tả hộp thuốc 3D chân thực, rõ nét ở vị trí trung tâm hoặc góc đẹp. Tiêu đề "${data.name}" phải thật lớn, thiết kế font chữ 3D nổi bật, sang trọng ở phía trên.
    2. TÂM ĐIỂM (GIÁ IDECO): Toàn bộ cụm chữ "GIÁ BÁN TỪ IDECO CHỈ CÒN ĐẾN: ${data.idecoPrice}" phải là điểm nhấn LỚN NHẤT, RỰC RỠ NHẤT của poster. Hãy mô tả nó được thiết kế dạng chữ 3D phát sáng (neon) hoặc mạ vàng kim loại, đặt trong một khung kính trong suốt hoặc ruy băng lụa cao cấp lơ lửng. Nó phải cực kỳ ấn tượng và thu hút mắt nhìn ngay lập tức.
    3. SO SÁNH GIÁ: Giá niêm yết "${data.listPrice}" đặt cạnh bên hoặc phía dưới, kích thước nhỏ hơn đáng kể, font chữ thanh mảnh, màu sắc nhã nhặn để tạo sự tương phản làm nổi bật giá IDECO.
    4. NHÃN BẮT BUỘC: ${data.isETC ? 'Góc trên bên trái poster PHẢI CÓ một khung hình chữ nhật màu đỏ đậm, bên trong là chữ trắng in hoa đậm "THUỐC KÊ TOA".' : ''}
    5. CHÂN TRANG: Dòng chữ "Nhà sản xuất bởi: ${data.manufacturer}" đặt nhỏ gọn, tinh tế ở mép dưới cùng của poster.

    BỐI CẢNH NGHỆ THUẬT:
    - Môi trường: Nhà thuốc tây hiện đại, sang trọng với quầy kính sạch sẽ, hoặc phòng lab công nghệ cao, hoặc phông nền studio trừu tượng với các hình khối 3D mềm mại (tone màu trắng/xanh mint/cam pastel tùy theo màu hộp thuốc).
    - Ánh sáng: Ánh sáng studio khối (volumetric lighting), đổ bóng mềm mại, focus sắc nét vào hộp thuốc và giá tiền, hiệu ứng bokeh lung linh ở hậu cảnh.
    - Chất lượng: Độ phân giải 8k, siêu thực (photorealistic), chi tiết sắc sảo.
    - Khổ ảnh: ${data.aspectRatio === 'vertical' ? 'Dọc (Portrait 9:16)' : data.aspectRatio === 'horizontal' ? 'Ngang (Landscape 16:9)' : 'Vuông (Square 1:1)'}.

    YÊU CẦU ĐẦU RA: Chỉ trả về đoạn văn mô tả (prompt) hoàn chỉnh bằng TIẾNG VIỆT. Không thêm lời chào, không thêm giải thích.
    `;

    parts.push({ text: promptInput });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: { parts: parts }
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
  task: 'remove-bg' | 'make-3d',
  customApiKey?: string
): Promise<string> => {
  const apiKey = customApiKey || process.env.API_KEY;
  if (!apiKey) throw new Error("Thiếu API Key.");
  const ai = new GoogleGenAI({ apiKey });
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

/**
 * Generates an image from a prompt using Gemini 3.1 Flash Image Preview.
 */
export const generateImageFromPrompt = async (
  prompt: string,
  aspectRatio: 'vertical' | 'horizontal' | 'square',
  imageBase64?: string,
  mimeType?: string,
  customApiKey?: string
): Promise<string> => {
  const apiKey = customApiKey || process.env.API_KEY;
  if (!apiKey) throw new Error("Thiếu API Key.");
  const ai = new GoogleGenAI({ apiKey });

  let ratioStr = "1:1";
  if (aspectRatio === 'vertical') ratioStr = "9:16";
  if (aspectRatio === 'horizontal') ratioStr = "16:9";

  const parts: any[] = [];
  if (imageBase64 && mimeType) {
    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    parts.push({
      inlineData: {
        mimeType: mimeType,
        data: base64Data
      }
    });
  }
  parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: parts,
      },
      config: {
        imageConfig: {
          aspectRatio: ratioStr
        }
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("AI did không trả về hình ảnh.");
  } catch (error) {
    console.error("Image Generation Error:", error);
    throw error;
  }
};
