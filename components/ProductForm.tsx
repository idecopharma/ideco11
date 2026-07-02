
import { AlertCircle, Box, DollarSign, Download, Eraser, Factory, HeartPulse, Link as LinkIcon, Loader2, Monitor, Pill, Quote, Smartphone, Square, Tag, Trash2, Upload } from 'lucide-react';
import React, { useMemo, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { ExcelMapping, ProductData } from '../types';
import { removeBackgroundWithRemoveBg } from '../services/geminiService';

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
  { id: 'female_patient', label: '👩 Nữ bệnh nhân', text: 'Tạo poster chuyên nghiệp. Một bệnh nhân nữ trung niên người Việt Nam, tay cầm sản phẩm, tươi cười, tại phòng khám hiện đại.' },
  { id: 'doctor_consult', label: '👨‍⚕️ Bác sĩ tư vấn', text: 'Bác sĩ nam đang tư vấn, cầm hộp sản phẩm đưa về hướng bệnh nhân nam. Nền sáng, chuyên nghiệp.' },
  { id: 'packshot_3d', label: '📦 Packshot 3D', text: 'Chụp packshot sản phẩm 3D chuyên nghiệp, đặt trên bục sang trọng, ánh sáng cinematic.' }
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
  const [isUrlRemoveBgLoading, setIsUrlRemoveBgLoading] = useState(false);
  
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

  const handleUrlRemoveBg = async () => {
    if (!imageUrlInput.trim()) return;
    setIsUrlRemoveBgLoading(true);
    try {
      const processedDataUrl = await removeBackgroundWithRemoveBg({ imageUrl: imageUrlInput });
      const res = await fetch(processedDataUrl);
      const blob = await res.blob();
      const file = new File([blob], "image_nobg.png", { type: "image/png" });
      onImageUpload(activeTab, file);
      setImageUrlInput('');
    } catch (e) {
      alert("Lỗi xóa nền bằng remover.bg: " + (e instanceof Error ? e.message : "Vui lòng kiểm tra lại liên kết ảnh."));
    } finally {
      setIsUrlRemoveBgLoading(false);
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
      <div className="flex border-b border-slate-200 bg-slate-50 rounded-t-xl overflow-x-auto scrollbar-none whitespace-nowrap">
        {products.map((p) => (
          <button
            key={p.id}
            onClick={() => onTabChange(p.id)}
            className={`flex-1 min-w-[95px] md:min-w-0 py-3 text-sm font-semibold transition-all border-r border-slate-200 last:border-r-0 shrink-0
              ${activeTab === p.id ? 'bg-white text-emerald-700 border-t-2 border-t-emerald-500 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            Sản phẩm {p.id}
          </button>
        ))}
      </div>

      <div className="p-6 md:p-8 flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between mb-6 gap-3">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Pill className="w-5 h-5 text-emerald-600" /> Thông Tin SP {activeTab}
            </h2>
            <div className="bg-slate-100 p-1 rounded-lg flex border border-slate-200">
                <button onClick={() => onChange(activeTab, 'aspectRatio', 'vertical')} className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-all ${activeProduct.aspectRatio === 'vertical' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}><Smartphone className="w-3 h-3" /> Dọc</button>
                <button onClick={() => onChange(activeTab, 'aspectRatio', 'square')} className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-all ${activeProduct.aspectRatio === 'square' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}><Square className="w-3 h-3" /> Vuông</button>
                <button onClick={() => onChange(activeTab, 'aspectRatio', 'horizontal')} className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-all ${activeProduct.aspectRatio === 'horizontal' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}><Monitor className="w-3 h-3" /> Ngang</button>
            </div>
        </div>

        <div className="space-y-5">
          {/* Image Area */}
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 bg-slate-50/50 hover:bg-white hover:border-emerald-400 transition-colors relative group">
            <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700">Ảnh Sản Phẩm (Gốc/Xử lý)</span>
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
                    <p className="text-sm">Click để tải ảnh lên</p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 border-t border-slate-200 pt-4">
                     <div className="flex items-center gap-2 flex-1">
                         <LinkIcon className="w-4 h-4 text-slate-400 shrink-0" />
                         <input 
                            type="text" placeholder="Dán link ảnh (URL) vào đây..."
                            className="w-full text-xs border border-slate-300 rounded px-3 py-2 outline-none focus:border-emerald-500"
                            value={imageUrlInput} onChange={(e) => setImageUrlInput(e.target.value)}
                         />
                     </div>
                     <div className="flex items-center gap-2">
                         <button onClick={handleUrlLoad} disabled={!imageUrlInput.trim() || isUrlLoading || isUrlRemoveBgLoading} className="text-xs bg-slate-600 hover:bg-slate-700 text-white px-3 py-2 rounded font-bold disabled:opacity-50 transition-colors flex items-center gap-1 shrink-0">
                            {isUrlLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : null} Tải ảnh
                         </button>
                         <button onClick={handleUrlRemoveBg} disabled={!imageUrlInput.trim() || isUrlLoading || isUrlRemoveBgLoading} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded font-bold disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-sm shrink-0" title="Xóa nền tự động bằng API remover.bg">
                            {isUrlRemoveBgLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : <Eraser className="w-3.5 h-3.5" />} Tải & Xóa nền (remover.bg)
                         </button>
                     </div>
                  </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-24 h-24 rounded-lg overflow-hidden border border-slate-200 bg-white relative shrink-0">
                        {(isImageProcessing || isUrlRemoveBgLoading) && (
                            <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
                                <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                            </div>
                        )}
                        <img src={activeProduct.imageBase64} alt="Product" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 space-y-2">
                        <p className="text-sm font-bold text-slate-700">Công cụ xử lý ảnh:</p>
                        <div className="flex flex-wrap gap-2">
                            <button 
                                onClick={() => onProcessImage(activeTab, 'remove-bg')}
                                disabled={isImageProcessing || isUrlRemoveBgLoading}
                                className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-bold flex items-center gap-1.5 hover:bg-indigo-700 disabled:opacity-50"
                                title="Sử dụng API remover.bg để xóa nền"
                            >
                                <Eraser className="w-3.5 h-3.5" /> Xóa nền (remover.bg)
                            </button>
                            <button 
                                onClick={() => onProcessImage(activeTab, 'make-3d')}
                                disabled={isImageProcessing || isUrlRemoveBgLoading}
                                className="px-3 py-1.5 bg-purple-600 text-white rounded text-xs font-bold flex items-center gap-1.5 hover:bg-purple-700 disabled:opacity-50"
                            >
                                <Box className="w-3.5 h-3.5" /> Tạo 3D
                            </button>
                            <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-slate-200 text-slate-600 rounded text-xs font-bold hover:bg-slate-300 transition-colors">Đổi ảnh</button>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 border-t border-slate-200 pt-3">
                   <div className="flex items-center gap-2 flex-1">
                       <LinkIcon className="w-4 h-4 text-slate-400 shrink-0" />
                       <input 
                          type="text" placeholder="Dán link ảnh mới (URL)..."
                          className="w-full text-xs border border-slate-300 rounded px-3 py-1.5 outline-none focus:border-emerald-500"
                          value={imageUrlInput} onChange={(e) => setImageUrlInput(e.target.value)}
                       />
                   </div>
                   <div className="flex items-center gap-2">
                       <button onClick={handleUrlLoad} disabled={!imageUrlInput.trim() || isUrlLoading || isUrlRemoveBgLoading} className="text-xs bg-slate-600 hover:bg-slate-700 text-white px-3 py-1.5 rounded font-bold disabled:opacity-50 transition-colors flex items-center gap-1 shrink-0">
                          {isUrlLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : null} Tải ảnh
                       </button>
                       <button onClick={handleUrlRemoveBg} disabled={!imageUrlInput.trim() || isUrlLoading || isUrlRemoveBgLoading} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded font-bold disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-sm shrink-0" title="Xóa nền trực tiếp từ link bằng API remover.bg">
                          {isUrlRemoveBgLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : <Eraser className="w-3.5 h-3.5" />} Tải & Xóa nền (remover.bg)
                       </button>
                   </div>
                </div>
              </div>
            )}
          </div>

          <div className="relative z-20">
            <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-bold text-slate-700 uppercase tracking-tight">Tên Thuốc (Tiêu đề 1)</label>
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                    <AlertCircle className={`w-3 h-3 ${activeProduct.isETC ? 'text-red-500' : 'text-slate-400'}`} />
                    <span className={`text-[10px] font-bold uppercase ${activeProduct.isETC ? 'text-red-600' : 'text-slate-500'}`}>Thuốc kê toa (ETC)</span>
                    <button 
                        onClick={() => onChange(activeTab, 'isETC', !activeProduct.isETC)}
                        className={`w-10 h-5 rounded-full relative transition-all duration-300 ${activeProduct.isETC ? 'bg-red-500' : 'bg-slate-300'}`}
                    >
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 ${activeProduct.isETC ? 'left-5.5' : 'left-0.5'}`} />
                    </button>
                </div>
            </div>
            <div className="relative">
              <input type="text" value={activeProduct.name} onChange={(e) => handleChange(e, 'name')} onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} placeholder="VD: Panadol Extra" className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-lg" />
              <Pill className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
              {showSuggestions && suggestions.length > 0 && (
                  <ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto">
                      {suggestions.map((item, idx) => (
                          <li key={idx} onMouseDown={() => handleSuggestionClick(item)} className="px-4 py-3 hover:bg-emerald-50 cursor-pointer text-sm border-b border-slate-50 last:border-0"><span className="font-bold text-emerald-700">{item[columnMapping!.name]}</span></li>
                      ))}
                  </ul>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Hàm lượng & Quy cách</label>
              <input type="text" value={activeProduct.dosage} onChange={(e) => handleChange(e, 'dosage')} placeholder="VD: 500mg, Hộp 20 viên" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Công dụng (Dòng phụ)</label>
              <div className="relative">
                <input type="text" value={activeProduct.usage} onChange={(e) => handleChange(e, 'usage')} placeholder="VD: Giảm đau, hạ sốt" className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                <HeartPulse className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Giá Niêm Yết (Tiêu đề 2)</label>
              <div className="relative">
                <input type="text" value={activeProduct.listPrice} onChange={(e) => handleChange(e, 'listPrice')} placeholder="VD: 73,000 đồng/ hộp 20 gói 5ml" className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-semibold text-slate-600" />
                <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-bold text-emerald-700">Giá IDECO (Tiêu đề 3 - Nổi bật)</label>
                <span className="text-[10px] bg-emerald-100 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded-sm animate-pulse">CENTERPIECE</span>
              </div>
              <div className="relative">
                <input type="text" value={activeProduct.idecoPrice} onChange={(e) => handleChange(e, 'idecoPrice')} placeholder="VD: 55,000 đồng/ hộp 3 vỉ x 5" className="w-full pl-10 pr-4 py-2 border-2 border-emerald-400 bg-emerald-50 rounded-lg focus:ring-2 focus:ring-emerald-500 font-black text-emerald-900 outline-none shadow-md" />
                <DollarSign className="w-4 h-4 text-emerald-600 absolute left-3 top-2.5" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nhà Sản Xuất (Tiêu đề 4)</label>
            <div className="relative">
              <input type="text" value={activeProduct.manufacturer} onChange={(e) => handleChange(e, 'manufacturer')} placeholder="VD: Công ty DP APIMED" className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
              <Factory className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Bối cảnh Poster & Mẫu</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {PROMPT_TEMPLATES.map(t => (
                <button key={t.id} onClick={() => onChange(activeTab, 'description', t.text)} className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-600 border border-slate-200 rounded-full text-xs font-bold transition-all"><Quote className="w-3 h-3 inline mr-1" />{t.label}</button>
              ))}
            </div>
            <textarea value={activeProduct.description} onChange={(e) => handleChange(e, 'description')} placeholder="Ghi chú thêm về ánh sáng, phong cách..." className="w-full pl-4 pr-4 py-2 border border-slate-300 rounded-lg h-24 resize-none outline-none text-sm" />
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
          {isProcessing ? 'Đang Thiết Kế Prompt...' : 'Tạo 3 Prompt Chuyên Nghiệp'}
        </button>
      </div>
    </div>
  );
};
