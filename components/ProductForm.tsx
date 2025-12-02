
import React, { useRef } from 'react';
import { ProductData } from '../types';
import { Pill, DollarSign, Factory, FileText, Tag, Upload, Trash2, HeartPulse, AlertCircle, Smartphone, Monitor, Quote } from 'lucide-react';
import { Sparkles } from 'lucide-react';

interface ProductFormProps {
  products: ProductData[];
  activeTab: number;
  onTabChange: (id: number) => void;
  onChange: (id: number, field: keyof ProductData, value: string | boolean) => void;
  onImageUpload: (id: number, file: File) => void;
  onRemoveImage: (id: number) => void;
  onSubmit: () => void;
  isProcessing: boolean;
}

const PROMPT_TEMPLATES = [
  {
    id: 'female_patient',
    label: '👩 Nữ bệnh nhân cầm thuốc',
    text: 'Tạo poster quảng cáo chuyên nghiệp, đẹp với nền sáng, rõ ràng chân thật. Một bệnh nhân nữ trung niên người Việt Nam, tay cầm sản phẩm, tươi cười mắt nhìn thẳng camera, tại phòng khám hiện đại.'
  },
  {
    id: 'doctor_consult',
    label: '👨‍⚕️ Bác sĩ & Bệnh nhân Nam',
    text: 'Tạo poster quảng cáo đẹp, nền sáng, màu sắc tươi sáng. Một Nam bệnh nhân người Việt Nam, tuổi trung niên ngồi khám với một Bác sĩ nam, đang cầm trên tay hộp sản phẩm theo ảnh đính kèm đưa về hướng bệnh nhân.'
  },
  {
    id: 'packshot_3d',
    label: '📦 Packshot 3D Nền tự nhiên',
    text: 'Tạo poster quảng cáo chuyên nghiệp, chụp packshot sản phẩm với phối cảnh 3D đẹp, sản phẩm đặt trên nền tự nhiên đẹp, tạo tương phản với sản phẩm, ánh sáng cinematic, chất lượng 2k.'
  }
];

export const ProductForm: React.FC<ProductFormProps> = ({ 
  products, 
  activeTab, 
  onTabChange, 
  onChange, 
  onImageUpload,
  onRemoveImage,
  onSubmit, 
  isProcessing 
}) => {
  
  const activeProduct = products.find(p => p.id === activeTab) || products[0];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: keyof ProductData) => {
    onChange(activeTab, field, e.target.value);
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof ProductData) => {
    onChange(activeTab, field, e.target.checked);
  };

  const handleRadioChange = (value: string) => {
    onChange(activeTab, 'aspectRatio', value);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageUpload(activeTab, e.target.files[0]);
    }
  };

  const applyTemplate = (text: string) => {
    onChange(activeTab, 'description', text);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-white rounded-xl shadow-lg flex flex-col h-full border border-slate-200">
      
      {/* Product Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50 rounded-t-xl overflow-hidden">
        {products.map((product) => (
          <button
            key={product.id}
            onClick={() => onTabChange(product.id)}
            className={`flex-1 py-3 text-sm font-semibold transition-all border-r border-slate-200 last:border-r-0
              ${activeTab === product.id 
                ? 'bg-white text-emerald-700 border-t-2 border-t-emerald-500 shadow-sm' 
                : 'text-slate-500 hover:bg-slate-100'}`}
          >
            Sản phẩm {product.id}
          </button>
        ))}
      </div>

      <div className="p-6 md:p-8 flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex flex-wrap items-center justify-between mb-6 gap-3">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Pill className="w-5 h-5 text-emerald-600" />
                Thông Tin SP {activeTab}
            </h2>
            
            <div className="flex items-center gap-3">
                 {/* Aspect Ratio Selector */}
                 <div className="bg-slate-100 p-1 rounded-lg flex border border-slate-200">
                    <button
                        onClick={() => handleRadioChange('vertical')}
                        className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-all ${activeProduct.aspectRatio === 'vertical' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Smartphone className="w-3 h-3" /> Dọc
                    </button>
                    <button
                        onClick={() => handleRadioChange('horizontal')}
                        className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-all ${activeProduct.aspectRatio === 'horizontal' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Monitor className="w-3 h-3" /> Ngang
                    </button>
                </div>

                {/* ETC Toggle */}
                <label className="flex items-center gap-2 cursor-pointer bg-slate-100 px-3 py-1.5 rounded-full hover:bg-slate-200 transition-colors border border-slate-200">
                    <input 
                    type="checkbox" 
                    checked={activeProduct.isETC}
                    onChange={(e) => handleCheckboxChange(e, 'isETC')}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-gray-300 accent-emerald-600" 
                    />
                    <span className={`text-xs font-bold ${activeProduct.isETC ? 'text-red-600' : 'text-slate-500'}`}>
                    ETC
                    </span>
                    {activeProduct.isETC && <AlertCircle className="w-4 h-4 text-red-500" />}
                </label>
            </div>
        </div>

        <div className="space-y-5">
          
          {/* Image Upload Area */}
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 bg-slate-50/50 hover:bg-white hover:border-emerald-400 transition-colors">
            <label className="block text-sm font-medium text-slate-700 mb-2 flex justify-between">
              <span>Ảnh Sản Phẩm (Để AI nhận diện)</span>
              {activeProduct.imageBase64 && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onRemoveImage(activeTab); }}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Xóa ảnh
                </button>
              )}
            </label>
            
            <input 
              type="file" 
              accept="image/png, image/jpeg, image/webp, image/heic"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />

            {!activeProduct.imageBase64 ? (
              <div 
                onClick={triggerFileUpload}
                className="cursor-pointer flex flex-col items-center justify-center py-6 text-slate-400"
              >
                <Upload className="w-8 h-8 mb-2 text-slate-300" />
                <p className="text-sm">Click để tải ảnh thuốc/hộp lên</p>
                <p className="text-xs text-slate-400 mt-1">(AI sẽ tự nhìn ảnh để viết mô tả)</p>
              </div>
            ) : (
              <div className="flex items-center gap-4 cursor-pointer" onClick={triggerFileUpload}>
                <div className="w-20 h-20 rounded-md overflow-hidden border border-slate-200 shadow-sm shrink-0 bg-white">
                  <img src={activeProduct.imageBase64} alt="Product" className="w-full h-full object-contain" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700 truncate">Ảnh đã tải lên</p>
                  <p className="text-xs text-emerald-600 font-medium hover:underline mt-1">
                    Click để thay đổi ảnh
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Row 1: Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tên Thuốc (Tiêu đề 1)</label>
            <div className="relative">
              <input
                type="text"
                value={activeProduct.name}
                onChange={(e) => handleChange(e, 'name')}
                placeholder="VD: Panadol Extra"
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
              />
              <Pill className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          {/* Row 2: Dosage & Usage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Hàm lượng</label>
              <input
                type="text"
                value={activeProduct.dosage}
                onChange={(e) => handleChange(e, 'dosage')}
                placeholder="VD: 500mg, Hộp 20 viên"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Công dụng (Dòng phụ)</label>
              <div className="relative">
                <input
                  type="text"
                  value={activeProduct.usage}
                  onChange={(e) => handleChange(e, 'usage')}
                  placeholder="VD: Giảm đau, hạ sốt nhanh"
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <HeartPulse className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>
          </div>

          {/* Row 3: Prices */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Giá Niêm Yết (Tiêu đề 2)</label>
              <div className="relative">
                <input
                  type="text"
                  value={activeProduct.listPrice}
                  onChange={(e) => handleChange(e, 'listPrice')}
                  placeholder="200,000 đ"
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-emerald-700 mb-1">Giá từ IDECO (Tiêu đề 3)</label>
              <div className="relative">
                <input
                  type="text"
                  value={activeProduct.idecoPrice}
                  onChange={(e) => handleChange(e, 'idecoPrice')}
                  placeholder="10,000 đ"
                  className="w-full pl-10 pr-4 py-2 border-2 border-emerald-100 bg-emerald-50 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-800 outline-none"
                />
                <DollarSign className="w-4 h-4 text-emerald-600 absolute left-3 top-3" />
              </div>
            </div>
          </div>

          {/* Manufacturer */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nhà Sản Xuất (Tiêu đề 4)</label>
            <div className="relative">
              <input
                type="text"
                value={activeProduct.manufacturer}
                onChange={(e) => handleChange(e, 'manufacturer')}
                placeholder="VD: DHG Pharma"
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <Factory className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          {/* Description Prompt */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Ghi chú thêm & Mẫu có sẵn</label>
            
            {/* Template Buttons */}
            <div className="flex flex-wrap gap-2 mb-3">
              {PROMPT_TEMPLATES.map(template => (
                <button
                  key={template.id}
                  onClick={() => applyTemplate(template.text)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 rounded-full text-xs font-medium transition-all"
                  title={template.text}
                >
                  <Quote className="w-3 h-3" />
                  {template.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <textarea
                value={activeProduct.description}
                onChange={(e) => handleChange(e, 'description')}
                placeholder="Mô tả bối cảnh, ánh sáng, hoặc sử dụng các nút mẫu ở trên..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none h-24 resize-none custom-scrollbar text-sm"
              />
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-xl">
        <button
          onClick={onSubmit}
          disabled={isProcessing}
          className={`w-full py-3 px-6 rounded-lg text-white font-bold shadow-md transition-all flex items-center justify-center gap-2 uppercase tracking-wide
            ${isProcessing 
              ? 'bg-slate-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg active:scale-[0.98]'
            }`}
        >
          {isProcessing ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Đang Tạo 3 Prompt...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Tạo Prompt Cho Cả 3 Sản Phẩm
            </>
          )}
        </button>
      </div>
    </div>
  );
};
