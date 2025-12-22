
import React, { useRef, useState, useMemo } from 'react';
import { ProductData, ExcelMapping } from '../types';
import { Pill, DollarSign, Factory, FileText, Tag, Upload, Trash2, HeartPulse, Smartphone, Monitor, Quote, Search, Link as LinkIcon, Download, X, Eraser, Box, Loader2 } from 'lucide-react';
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
  masterLibrary?: any[];
  columnMapping?: ExcelMapping;
  onApplyLibraryProduct?: (id: number, libraryItem: any) => void;
  imageLoading?: boolean;
  onAIAction?: (task: 'remove_bg' | 'make_3d') => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({ 
  products, 
  activeTab, 
  onTabChange, 
  onChange, 
  onImageUpload, 
  onRemoveImage,
  onSubmit, 
  isProcessing,
  masterLibrary = [],
  columnMapping,
  onApplyLibraryProduct,
  imageLoading,
  onAIAction
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

  const handleUrlLoad = async () => {
      if (!imageUrlInput.trim()) return;
      setIsUrlLoading(true);
      try {
          const img = new Image();
          img.crossOrigin = "Anonymous";
          img.src = imageUrlInput;
          await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = () => reject(new Error("CORS error or invalid URL"));
          });
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
              ctx.drawImage(img, 0, 0);
              const dataURL = canvas.toDataURL('image/png');
              const res = await fetch(dataURL);
              const blob = await res.blob();
              const file = new File([blob], "downloaded_image.png", { type: "image/png" });
              onImageUpload(activeTab, file);
              setImageUrlInput('');
          }
      } catch (e) {
          alert("Lỗi tải ảnh: Trang web gốc chặn tải trực tiếp (CORS). Hãy tải về máy và upload thủ công.");
      } finally {
          setIsUrlLoading(false);
      }
  };

  const handleDownloadImage = () => {
    if (!activeProduct.imageBase64) return;
    const link = document.createElement('a');
    link.href = activeProduct.imageBase64;
    // Đặt tên file theo Tên Thuốc (Tiêu đề 1)
    const fileName = activeProduct.name ? activeProduct.name.replace(/[/\\?%*:|"<>]/g, '-') : `product-${activeTab}`;
    link.download = `${fileName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg flex flex-col h-full border border-slate-200">
      <div className="flex border-b border-slate-200 bg-slate-50 rounded-t-xl overflow-hidden">
        {products.map((p) => (
          <button key={p.id} onClick={() => onTabChange(p.id)} className={`flex-1 py-3 text-sm font-semibold transition-all border-r border-slate-200 last:border-r-0 ${activeTab === p.id ? 'bg-white text-emerald-700 border-t-2 border-t-emerald-500 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>
            Sản phẩm {p.id}
          </button>
        ))}
      </div>

      <div className="p-6 md:p-8 flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex flex-wrap items-center justify-between mb-6 gap-3">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Pill className="w-5 h-5 text-emerald-600" /> Thông Tin SP {activeTab}
            </h2>
            <div className="flex items-center gap-3">
                 <div className="bg-slate-100 p-1 rounded-lg flex border border-slate-200">
                    <button onClick={() => onChange(activeTab, 'aspectRatio', 'vertical')} className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-all ${activeProduct.aspectRatio === 'vertical' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}><Smartphone className="w-3 h-3" /> Dọc</button>
                    <button onClick={() => onChange(activeTab, 'aspectRatio', 'horizontal')} className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-all ${activeProduct.aspectRatio === 'horizontal' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}><Monitor className="w-3 h-3" /> Ngang</button>
                </div>
                <label className="flex items-center gap-2 cursor-pointer bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                    <input type="checkbox" checked={activeProduct.isETC} onChange={(e) => onChange(activeTab, 'isETC', e.target.checked)} className="w-4 h-4 text-emerald-600 accent-emerald-600" />
                    <span className={`text-xs font-bold ${activeProduct.isETC ? 'text-red-600' : 'text-slate-500'}`}>ETC</span>
                </label>
            </div>
        </div>

        <div className="space-y-5">
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 bg-slate-50/50 hover:bg-white hover:border-emerald-400 transition-colors relative">
            <label className="block text-sm font-medium text-slate-700 mb-2 flex justify-between items-center">
              <span>Ảnh Sản Phẩm (Gốc hoặc Link)</span>
              {activeProduct.imageBase64 && (
                <button onClick={() => onRemoveImage(activeTab)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"><Trash2 className="w-3 h-3" /> Xóa</button>
              )}
            </label>
            
            <input type="file" accept="image/*" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && onImageUpload(activeTab, e.target.files[0])} className="hidden" />

            {imageLoading ? (
                <div className="flex flex-col items-center justify-center py-10 text-emerald-600">
                    <Loader2 className="w-10 h-10 animate-spin mb-2" />
                    <p className="text-sm font-bold animate-pulse">AI đang xử lý ảnh...</p>
                </div>
            ) : !activeProduct.imageBase64 ? (
              <div className="flex flex-col gap-4">
                  <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer flex flex-col items-center justify-center py-4 text-slate-400 hover:text-emerald-500">
                    <Upload className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm font-medium">Tải ảnh thuốc lên máy</p>
                  </div>
                  <div className="flex items-center gap-2 border-t border-slate-200 pt-3">
                     <LinkIcon className="w-4 h-4 text-slate-400" />
                     <input type="text" placeholder="Dán link ảnh..." className="flex-1 text-xs border border-slate-300 rounded px-2 py-1.5 outline-none" value={imageUrlInput} onChange={(e) => setImageUrlInput(e.target.value)} />
                     <button onClick={handleUrlLoad} disabled={!imageUrlInput.trim() || isUrlLoading} className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded disabled:opacity-50">Dùng</button>
                  </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <div className="w-24 h-24 rounded-md overflow-hidden border border-slate-200 shadow-sm shrink-0 bg-white relative group">
                        <img src={activeProduct.imageBase64} alt="Product" className="w-full h-full object-contain" />
                        <div onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                            <Upload className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-2">
                        <button onClick={() => onAIAction?.('remove_bg')} className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-indigo-200 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-50 transition-all shadow-sm">
                            <Eraser className="w-4 h-4" /> Xóa Nền AI
                        </button>
                        <button onClick={() => onAIAction?.('make_3d')} className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-md">
                            <Box className="w-4 h-4" /> Tạo Hộp 3D
                        </button>
                        <button onClick={handleDownloadImage} className="col-span-2 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg hover:bg-emerald-100 transition-all">
                            <Download className="w-4 h-4" /> Tải về máy (Tên: {activeProduct.name || 'SP'})
                        </button>
                    </div>
                </div>
              </div>
            )}
          </div>

          <div className="relative z-20">
            <label className="block text-sm font-medium text-slate-700 mb-1">Tên Thuốc (Tiêu đề 1)</label>
            <div className="relative">
              <input type="text" value={activeProduct.name} onChange={(e) => handleChange(e, 'name')} onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} placeholder="VD: Panadol Extra" className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none font-bold text-slate-800" />
              <Pill className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              {showSuggestions && suggestions.length > 0 && (
                  <ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto">
                      {suggestions.map((item, idx) => (
                          <li key={idx} onMouseDown={() => { onApplyLibraryProduct?.(activeTab, item); setShowSuggestions(false); }} className="px-4 py-2 hover:bg-emerald-50 cursor-pointer text-sm border-b border-slate-50 last:border-0">
                             <span className="font-semibold text-emerald-700">{item[columnMapping!.name]}</span>
                             {item[columnMapping!.dosage] && <span className="text-xs text-slate-500 ml-2">({item[columnMapping!.dosage]})</span>}
                          </li>
                      ))}
                  </ul>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Hàm lượng</label>
              <input type="text" value={activeProduct.dosage} onChange={(e) => onChange(activeTab, 'dosage', e.target.value)} placeholder="VD: 500mg" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Công dụng (Dòng phụ)</label>
              <div className="relative">
                <input type="text" value={activeProduct.usage} onChange={(e) => onChange(activeTab, 'usage', e.target.value)} placeholder="VD: Hạ sốt nhanh" className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none" />
                <HeartPulse className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Giá Niêm Yết</label>
              <input type="text" value={activeProduct.listPrice} onChange={(e) => onChange(activeTab, 'listPrice', e.target.value)} placeholder="200,000 đ" className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-emerald-700 mb-1">Giá từ IDECO</label>
              <div className="relative">
                <input type="text" value={activeProduct.idecoPrice} onChange={(e) => onChange(activeTab, 'idecoPrice', e.target.value)} placeholder="10,000 đ" className="w-full pl-10 pr-4 py-2 border-2 border-emerald-100 bg-emerald-50 rounded-lg font-bold text-emerald-800 outline-none" />
                <DollarSign className="w-4 h-4 text-emerald-600 absolute left-3 top-3" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nhà Sản Xuất</label>
            <input type="text" value={activeProduct.manufacturer} onChange={(e) => onChange(activeTab, 'manufacturer', e.target.value)} placeholder="VD: DHG Pharma" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Ghi chú thêm</label>
            <textarea value={activeProduct.description} onChange={(e) => onChange(activeTab, 'description', e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg outline-none h-20 resize-none text-sm" placeholder="Mô tả bối cảnh..." />
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-xl">
        <button onClick={onSubmit} disabled={isProcessing} className={`w-full py-3 px-6 rounded-lg text-white font-bold shadow-md transition-all flex items-center justify-center gap-2 uppercase tracking-wide ${isProcessing ? 'bg-slate-400' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg active:scale-[0.98]'}`}>
          {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          Tạo 3 Prompt Sản Phẩm
        </button>
      </div>
    </div>
  );
};
