
import { AlertCircle, Box, DollarSign, Download, Eraser, Factory, HeartPulse, Link as LinkIcon, Loader2, Monitor, Pill, Quote, Smartphone, Tag, Trash2, Upload } from 'lucide-react';
import React, { useMemo, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { ExcelMapping, ProductData } from '../types';

interface ProductFormProps {
  products: ProductData[];
  activeTab: number;
  onTabChange: (id: number) => void;
  onChange: (id: number, field: keyof ProductData, value: string | boolean) => void;
  onImageUpload: (id: number, file: File) => void;
  onRemoveImage: (id: number) => void;
  onSubmit: () => void;
  onProcessImage: (id: number, task: 'remove-bg' | 'make-3d') => Promise<void>;
  isProcessing: boolean;
  isImageProcessing: boolean;
  masterLibrary?: any[];
  columnMapping?: ExcelMapping;
  onApplyLibraryProduct?: (id: number, libraryItem: any) => void;
}

const PROMPT_TEMPLATES = [
  { id: 'pharmacist_female', label: '👩 Dược sĩ Nữ', text: 'Poster khổ dọc. Một nữ dược sĩ Việt Nam chuyên nghiệp trong áo blouse trắng, đang cầm sản phẩm giới thiệu cho khách hàng. Ánh sáng studio hiện đại.' },
  { id: 'pharmacist_male', label: '👨 Dược sĩ Nam', text: 'Poster khổ dọc. Dược sĩ nam đứng trong quầy thuốc hiện đại, tay cầm sản phẩm. Phong cách sạch sẽ, chuyên nghiệp, tin cậy.' },
  { id: 'packshot_3d', label: '📦 Packshot 3D', text: 'Chụp cận cảnh sản phẩm 3D khổ dọc, đặt trên bục sang trọng, ánh sáng tương phản cực đẹp, nền mờ ảo chuyên nghiệp.' }
];

export const ProductForm: React.FC<ProductFormProps> = ({ 
  products, activeTab, onTabChange, onChange, onImageUpload, onRemoveImage, onSubmit, onProcessImage,
  isProcessing, isImageProcessing, masterLibrary = [], columnMapping, onApplyLibraryProduct
}) => {
  const activeProduct = products.find(p => p.id === activeTab) || products[0];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isUrlLoading, setIsUrlLoading] = useState(false);
  
  const suggestions = useMemo(() => {
    if (!activeProduct.name || !masterLibrary.length || !columnMapping?.name) return [];
    const lowerInput = activeProduct.name.toLowerCase();
    const nameKey = columnMapping.name;
    return masterLibrary
        .filter(item => item[nameKey] && String(item[nameKey]).toLowerCase().includes(lowerInput))
        .slice(0, 5);
  }, [activeProduct.name, masterLibrary, columnMapping]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: keyof ProductData) => {
    onChange(activeTab, field, e.target.value);
    if (field === 'name') setShowSuggestions(true);
  };

  const handleSuggestionClick = (item: any) => {
      onApplyLibraryProduct?.(activeTab, item);
      setShowSuggestions(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) onImageUpload(activeTab, e.target.files[0]);
  };

  const handleUrlLoad = async () => {
    if (!imageUrlInput.trim()) return;
    setIsUrlLoading(true);
    try {
      const response = await fetch(imageUrlInput);
      const blob = await response.blob();
      const file = new File([blob], "image_from_url.png", { type: blob.type });
      onImageUpload(activeTab, file);
      setImageUrlInput('');
    } catch (e) {
      alert("Lỗi tải ảnh. Vui lòng thử lại hoặc tải ảnh về máy rồi upload thủ công.");
    } finally {
      setIsUrlLoading(false);
    }
  };

  const downloadProductImage = () => {
    if (!activeProduct.imageBase64) return;
    const link = document.createElement('a');
    link.href = activeProduct.imageBase64;
    const fileName = activeProduct.name ? activeProduct.name.trim().replace(/\s+/g, '_') : `Product_${activeTab}`;
    link.download = `${fileName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg flex flex-col h-full border border-slate-200">
      <div className="flex border-b border-slate-200 bg-slate-50 rounded-t-xl overflow-hidden">
        {products.map((p) => (
          <button
            key={p.id}
            onClick={() => onTabChange(p.id)}
            className={`flex-1 py-3 text-sm font-semibold transition-all border-r border-slate-200 last:border-r-0
              ${activeTab === p.id ? 'bg-white text-emerald-700 border-t-2 border-t-emerald-500 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            Sản phẩm {p.id}
          </button>
        ))}
      </div>

      <div className="p-6 md:p-8 flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between mb-6 gap-3">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Pill className="w-5 h-5 text-emerald-600" /> Thiết kế Poster {activeTab}
            </h2>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 font-bold text-xs uppercase">
                <Smartphone className="w-4 h-4" /> Luôn luôn khổ dọc
            </div>
        </div>

        <div className="space-y-5">
          {/* Image Area */}
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 bg-slate-50/50 hover:bg-white hover:border-emerald-400 transition-colors relative group">
            <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700">Ảnh Sản Phẩm (Reference)</span>
                {activeProduct.imageBase64 && (
                    <div className="flex gap-2">
                        <button onClick={downloadProductImage} className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline" title="Tải ảnh sản phẩm về máy">
                            <Download className="w-3 h-3" /> Tải về
                        </button>
                        <button onClick={() => onRemoveImage(activeTab)} className="text-xs text-red-500 font-bold flex items-center gap-1 hover:underline">
                            <Trash2 className="w-3 h-3" /> Xóa
                        </button>
                    </div>
                )}
            </div>
            
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

            {!activeProduct.imageBase64 ? (
              <div className="space-y-4">
                  <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer flex flex-col items-center justify-center py-6 text-slate-400">
                    <Upload className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">Click tải ảnh hoặc dán link</p>
                  </div>
                  <div className="flex items-center gap-2 border-t border-slate-200 pt-4">
                     <input 
                        type="text" placeholder="Dán link ảnh (URL)..."
                        className="flex-1 text-xs border border-slate-300 rounded px-3 py-2 outline-none"
                        value={imageUrlInput} onChange={(e) => setImageUrlInput(e.target.value)}
                     />
                     <button onClick={handleUrlLoad} disabled={!imageUrlInput.trim() || isUrlLoading} className="text-xs bg-emerald-600 text-white px-4 py-2 rounded font-bold disabled:opacity-50">
                        OK
                     </button>
                  </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-24 h-24 rounded-lg overflow-hidden border border-slate-200 bg-white relative shrink-0">
                        {isImageProcessing && (
                            <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
                                <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                            </div>
                        )}
                        <img src={activeProduct.imageBase64} alt="Product" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap gap-2">
                            <button 
                                onClick={() => onProcessImage(activeTab, 'remove-bg')}
                                disabled={isImageProcessing}
                                className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-bold flex items-center gap-1.5 hover:bg-indigo-700 disabled:opacity-50"
                            >
                                <Eraser className="w-3.5 h-3.5" /> Xóa nền
                            </button>
                            <button 
                                onClick={() => onProcessImage(activeTab, 'make-3d')}
                                disabled={isImageProcessing}
                                className="px-3 py-1.5 bg-purple-600 text-white rounded text-xs font-bold flex items-center gap-1.5 hover:bg-purple-700 disabled:opacity-50"
                            >
                                <Box className="w-3.5 h-3.5" /> Tạo 3D
                            </button>
                            <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-slate-200 text-slate-600 rounded text-xs font-bold hover:bg-slate-300">Đổi ảnh</button>
                        </div>
                    </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-bold text-slate-700 uppercase tracking-tight">Tên Thuốc (Tiêu đề 1)</label>
                <div className="flex items-center gap-2 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                    <span className={`text-[9px] font-bold uppercase ${activeProduct.isETC ? 'text-red-600' : 'text-slate-500'}`}>Kê toa</span>
                    <input type="checkbox" checked={activeProduct.isETC} onChange={(e) => onChange(activeTab, 'isETC', e.target.checked)} className="w-3 h-3 accent-red-600" />
                </div>
            </div>
            <div className="relative">
              <input type="text" value={activeProduct.name} onChange={(e) => handleChange(e, 'name')} onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} placeholder="VD: Panadol Extra" className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-bold" />
              <Pill className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              {showSuggestions && suggestions.length > 0 && (
                  <ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto">
                      {suggestions.map((item, idx) => (
                          <li key={idx} onMouseDown={() => handleSuggestionClick(item)} className="px-4 py-2.5 hover:bg-emerald-50 cursor-pointer text-sm border-b border-slate-50 last:border-0 font-medium">{item[columnMapping!.name]}</li>
                      ))}
                  </ul>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Hàm lượng</label>
              <input type="text" value={activeProduct.dosage} onChange={(e) => handleChange(e, 'dosage')} placeholder="500mg" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Công dụng (Dòng phụ)</label>
              <input type="text" value={activeProduct.usage} onChange={(e) => handleChange(e, 'usage')} placeholder="Hạ sốt, giảm đau" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Giá Niêm Yết</label>
              <div className="relative">
                <input type="text" value={activeProduct.listPrice} onChange={(e) => handleChange(e, 'listPrice')} placeholder="73,000 đồng" className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-semibold text-slate-600" />
                <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-emerald-700 mb-1">Giá mua từ IDECO chỉ</label>
              <div className="relative">
                <input type="text" value={activeProduct.idecoPrice} onChange={(e) => handleChange(e, 'idecoPrice')} placeholder="55,000 đồng" className="w-full pl-10 pr-4 py-2 border-2 border-emerald-400 bg-emerald-50 rounded-lg focus:ring-2 focus:ring-emerald-500 font-black text-emerald-900 outline-none" />
                <DollarSign className="w-4 h-4 text-emerald-600 absolute left-3 top-2.5" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nhà Sản Xuất</label>
            <input type="text" value={activeProduct.manufacturer} onChange={(e) => handleChange(e, 'manufacturer')} placeholder="VD: DHG Pharma" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Ý tưởng poster</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {PROMPT_TEMPLATES.map(t => (
                <button key={t.id} onClick={() => onChange(activeTab, 'description', t.text)} className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-600 border border-slate-200 rounded-full text-[10px] font-bold transition-all">{t.label}</button>
              ))}
            </div>
            <textarea value={activeProduct.description} onChange={(e) => handleChange(e, 'description')} placeholder="VD: Dược sĩ đang cười, ánh sáng nắng sớm..." className="w-full p-4 border border-slate-300 rounded-lg h-20 resize-none outline-none text-sm" />
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-xl">
        <button
          onClick={onSubmit}
          disabled={isProcessing}
          className={`w-full py-4 rounded-xl text-white font-bold shadow-lg transition-all flex items-center justify-center gap-2 uppercase tracking-wider
            ${isProcessing ? 'bg-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:shadow-xl active:scale-95'}`}
        >
          {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {isProcessing ? 'Đang tạo dữ liệu...' : 'Tạo 3 Prompt Sản Phẩm Khổ Dọc'}
        </button>
      </div>
    </div>
  );
};
