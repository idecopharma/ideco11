import type { PromptTemplate } from './types';

export const INITIAL_PROMPTS: PromptTemplate[] = [
  {
    name: 'Dược sĩ Hàn Quốc & IDECO',
    prompt: `Tạo poster chuyên nghiệp, đẹp với nội dung: một nữ dược sĩ Hàn Quốc xinh đẹp mặc áo khoát trắng in logo đỏ trên túi áo "IDECO" đừng trong quầy thuốc, tay cầm hộp sản phẩm, kế bên là tấm bảng to viềng inox đẹp không nội dung phía trên poster và có khổ rộng bằng poster , dưới bàn quầy thuốc là bình hoa thủy tinh nhỏ đẹp, với tấm thiệp trắng không nội dung. Phong cách poster sáng sủa, chi tiết, chân thật, khổ poster 3:4`,
    keywords: ['Chuyên nghiệp', 'Quầy thuốc hiện đại', 'Logo IDECO', 'Sáng sủa', 'Chân thật', 'Nữ dược sĩ']
  },
  {
    name: 'Dược sĩ Nam & IDECO',
    prompt: `Tạo một poster quảng cáo đẹp chuyên nghiệp, màu sắc sáng sủa với một dược Nam Hàn Quốc đẹp trai mặc áo khoát trắng in logo đỏ "IDECO" trên túi áo ngồi tại bàn trong quầy thuốc, với hộp thuốc ( lấy ảnh gốc đính kèm) để trên bàn kế bên tấm thiếp trắng , bình hoa thủy tin đẹp, trên tường quầy thuốc là tấm bảng hiệu to kết khổ dài poster màu trắng để trống, có viền gỗ đẹp.`,
    keywords: ['Dược sĩ Nam', 'Chuyên nghiệp', 'Logo IDECO', 'Sáng sủa', 'Quầy thuốc', 'Bảng hiệu trống']
  },
  {
    name: 'Ảnh Packshot Sản Phẩm',
    prompt: `'Tạo ảnh Packshot 3D sản phẩm đẹp theo ảnh gốc đình kèm, rỏ ,chi tiết, ảnh sản phẩm to như chụp cận cảnh,  ấn tượng , trên nền đẹp, sáng tạo hiệu ứng ánh sáng tương phản để thu hút , phía dưới ảnh là banner trắng dài ngang khổ ảnh để điền thông tin`,
    keywords: ['Packshot', 'Nền đẹp', 'Ánh sáng tương phản', 'Chi tiết cao', 'Banner trắng', 'Sản phẩm']
  }
];

export const GENERIC_KEYWORDS: string[] = [
    "Chất lượng 4K",
    "Siêu thực",
    "Chi tiết cao",
    "Ánh sáng điện ảnh",
    "Màu sắc rực rỡ",
    "Phong cách tối giản",
    "Vẽ tay",
    "Tranh sơn dầu",
    "Ảnh chụp chuyên nghiệp",
    "Góc rộng",
    "Cận cảnh"
];