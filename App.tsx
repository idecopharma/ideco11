
import React, { useState } from 'react';
import { ProductForm } from './components/ProductForm';
import { ResultDisplay } from './components/ResultDisplay';
import { ExternalToolModal } from './components/ExternalToolModal';
import { ExcelImportModal } from './components/ExcelImportModal';
import { PromptHistoryModal } from './components/PromptHistoryModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ProductData, GeneratedResult, AppState, ExcelMapping, SavedPrompt } from './types';
import { generateOptimizedPrompt, processProductImageAI, generateImageFromPrompt } from './services/geminiService';
import { PenTool, BrainCircuit, Table, Image as ImageIcon, History, Key } from 'lucide-react';
import useLocalStorage from './hooks/useLocalStorage';

const createEmptyProduct = (id: number): ProductData => ({
  id,
  name: '',
  dosage: '',
  usage: '',
  isETC: false,
  listPrice: '',
  idecoPrice: '',
  manufacturer: '',
  description: '',
  imageBase64: undefined,
  mimeType: undefined,
  aspectRatio: 'vertical'
});

const App: React.FC = () => {
  const [products, setProducts] = useState<ProductData[]>([
    createEmptyProduct(1),
    createEmptyProduct(2),
    createEmptyProduct(3),
    createEmptyProduct(4),
    createEmptyProduct(5),
    createEmptyProduct(6)
  ]);
  
  const [activeTab, setActiveTab] = useState<number>(1);
  const [results, setResults] = useState<GeneratedResult[]>([
    { id: 1, prompt: '', status: 'pending' },
    { id: 2, prompt: '', status: 'pending' },
    { id: 3, prompt: '', status: 'pending' },
    { id: 4, prompt: '', status: 'pending' },
    { id: 5, prompt: '', status: 'pending' },
    { id: 6, prompt: '', status: 'pending' }
  ]);
  
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [isImageProcessing, setIsImageProcessing] = useState(false);

  const [masterLibrary, setMasterLibrary] = useLocalStorage<any[]>('excelMasterLibrary', []);
  const [columnMapping, setColumnMapping] = useLocalStorage<ExcelMapping>('excelColumnMapping', {
    name: '', dosage: '', usage: '', listPrice: '', idecoPrice: '', manufacturer: '', packaging: ''
  });

  const [externalTool, setExternalTool] = useState<{ isOpen: boolean; type: 'mind' | 'image' | null }>({
    isOpen: false,
    type: null
  });
  
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  const [savedPrompts, setSavedPrompts] = useLocalStorage<SavedPrompt[]>('savedPrompts', []);
  const [userApiKey, setUserApiKey] = useLocalStorage<string>('userApiKey', '');

  const handleFieldChange = (id: number, field: keyof ProductData, value: string | boolean) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleImageUpload = (id: number, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert("Ảnh quá lớn. Vui lòng chọn ảnh dưới 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setProducts(prev => prev.map(p => p.id === id ? { 
        ...p, 
        imageBase64: reader.result as string,
        mimeType: file.type
      } : p));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (id: number) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, imageBase64: undefined, mimeType: undefined } : p));
  };

  const handleProcessImage = async (id: number, task: 'remove-bg' | 'make-3d') => {
    const product = products.find(p => p.id === id);
    if (!product?.imageBase64 || !product.mimeType) return;
    
    setIsImageProcessing(true);
    try {
      const processedBase64 = await processProductImageAI(product.imageBase64, product.mimeType, task, userApiKey);
      setProducts(prev => prev.map(p => p.id === id ? { 
        ...p, 
        imageBase64: processedBase64,
        mimeType: 'image/png'
      } : p));
    } catch (error) {
      alert("Lỗi xử lý ảnh: " + (error instanceof Error ? error.message : "Vui lòng thử lại."));
    } finally {
      setIsImageProcessing(false);
    }
  };

  const handleGenerateAll = async () => {
    if (!userApiKey && !process.env.API_KEY) {
        alert("Thiếu API Key. Vui lòng nhập API Key trong phần cài đặt.");
        setIsApiKeyModalOpen(true);
        return;
    }

    setAppState(AppState.PROCESSING);
    setResults(prev => prev.map(r => {
        const prod = products.find(p => p.id === r.id);
        if (prod && prod.name) return { ...r, status: 'loading', prompt: '', imageStatus: 'idle', imageUrl: undefined, imageError: undefined };
        return r;
    }));

    for (const product of products) {
      if (!product.name) continue;
      try {
        const prompt = await generateOptimizedPrompt(product, userApiKey);
        setResults(prev => prev.map(r => r.id === product.id ? { ...r, prompt, status: 'success' } : r));
        
        // Save to local storage
        setSavedPrompts(prev => {
          const prevArray = Array.isArray(prev) ? prev : [];
          const newPrompt: SavedPrompt = {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
            productName: product.name,
            prompt: prompt,
            timestamp: Date.now()
          };
          return [newPrompt, ...prevArray];
        });

        // Nghỉ 3 giây giữa các request để tránh bị Google chặn do gửi quá nhanh (Rate Limit)
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error: any) {
        let errorMessage = String(error);
        if (errorMessage.includes('429') || errorMessage.includes('Quota exceeded') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
            errorMessage = "Lỗi 429: Vượt quá giới hạn API miễn phí của Google. Vui lòng đợi 1 phút rồi thử lại, hoặc nhập API Key cá nhân của bạn bằng nút [API Key] ở góc trên.";
        }
        setResults(prev => prev.map(r => r.id === product.id ? { ...r, prompt: errorMessage, status: 'error' } : r));
      }
    }
    setAppState(AppState.COMPLETE);
  };

  const handleGenerateImage = async (id: number, prompt: string) => {
    if (!userApiKey && !process.env.API_KEY) {
        alert("Thiếu API Key. Vui lòng nhập API Key trong phần cài đặt.");
        setIsApiKeyModalOpen(true);
        return;
    }

    const product = products.find(p => p.id === id);
    if (!product) return;

    setResults(prev => prev.map(r => r.id === id ? { ...r, imageStatus: 'loading', imageError: undefined } : r));

    try {
      const imageUrl = await generateImageFromPrompt(prompt, product.aspectRatio, product.imageBase64, product.mimeType, userApiKey);
      setResults(prev => prev.map(r => r.id === id ? { ...r, imageStatus: 'success', imageUrl } : r));
    } catch (error) {
      setResults(prev => prev.map(r => r.id === id ? { ...r, imageStatus: 'error', imageError: String(error) } : r));
    }
  };

  const handleExcelImport = (importedProducts: ProductData[], rawData: any[], mapping: ExcelMapping) => {
    setMasterLibrary(rawData);
    setColumnMapping(mapping);
    setProducts(prev => {
        const newProducts = [...prev];
        importedProducts.forEach((imp, index) => {
            if (index < 6) {
                newProducts[index] = { ...createEmptyProduct(index + 1), ...imp, id: index + 1 };
            }
        });
        return newProducts;
    });
  };

  const handleApplyProductFromLibrary = (productIndex: number, libraryItem: any) => {
    const formatPriceString = (val: any, pack: any) => {
        if (val === undefined || val === null || val === '') return '';
        let p = '';
        if (typeof val === 'number') {
            p = val.toLocaleString('vi-VN');
        } else {
            const cleanNum = String(val).replace(/[^0-9]/g, "");
            p = (cleanNum && !isNaN(parseInt(cleanNum))) ? parseInt(cleanNum).toLocaleString('vi-VN') : String(val).trim();
        }
        if (p && !p.toLowerCase().includes('đồng')) p += ' đồng';
        return (pack && String(pack).trim()) ? `${p}/ ${String(pack).trim()}` : p;
    };

    const newProductData: Partial<ProductData> = {
        name: String(libraryItem[columnMapping.name] || '').trim(),
        dosage: String(libraryItem[columnMapping.dosage] || '').trim(),
        usage: String(libraryItem[columnMapping.usage] || '').trim(),
        listPrice: formatPriceString(libraryItem[columnMapping.listPrice], libraryItem[columnMapping.packaging]),
        idecoPrice: formatPriceString(libraryItem[columnMapping.idecoPrice], libraryItem[columnMapping.packaging]),
        manufacturer: String(libraryItem[columnMapping.manufacturer] || '').trim(),
    };

    setProducts(prev => prev.map(p => p.id === productIndex ? { ...p, ...newProductData } : p));
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row items-center justify-between pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg"><PenTool className="w-6 h-6" /></div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800">Pharma Prompt AI</h1>
              <p className="text-slate-500 text-sm font-medium">Xử lý ảnh & tạo Prompt hàng loạt (6 SP)</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 md:gap-3">
            <button onClick={() => setIsApiKeyModalOpen(true)} className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white text-slate-700 font-bold rounded-lg shadow border border-slate-200 hover:bg-slate-50 transition-all active:scale-95"><Key className="w-5 h-5" /> <span className="hidden md:inline">API Key</span></button>
            <button onClick={() => setIsHistoryModalOpen(true)} className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white text-indigo-700 font-bold rounded-lg shadow border border-indigo-200 hover:bg-indigo-50 transition-all active:scale-95"><History className="w-5 h-5" /> <span className="hidden md:inline">Lịch sử</span></button>
            <button onClick={() => setExcelModalOpen(true)} className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white text-emerald-700 font-bold rounded-lg shadow border border-emerald-200 hover:bg-emerald-50 transition-all active:scale-95"><Table className="w-5 h-5" /> <span className="hidden md:inline">Excel</span></button>
            <button onClick={() => window.open('https://lmarena.ai/', '_blank')} className="flex items-center gap-2 px-3 md:px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all active:scale-95"><ImageIcon className="w-5 h-5" /> <span className="hidden md:inline">Tạo Ảnh</span></button>
            <button onClick={() => setExternalTool({ isOpen: true, type: 'mind' })} className="flex items-center gap-2 px-3 md:px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all active:scale-95"><BrainCircuit className="w-5 h-5" /> <span className="hidden md:inline">Mind</span></button>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <ProductForm 
              products={products} activeTab={activeTab} onTabChange={setActiveTab} onChange={handleFieldChange}
              onImageUpload={handleImageUpload} onRemoveImage={handleRemoveImage} onSubmit={handleGenerateAll}
              onProcessImage={handleProcessImage} isProcessing={appState === AppState.PROCESSING} isImageProcessing={isImageProcessing}
              masterLibrary={masterLibrary} columnMapping={columnMapping} onApplyLibraryProduct={handleApplyProductFromLibrary}
            />
          </div>
          <div className="lg:col-span-5">
            <ResultDisplay results={results} appState={appState} onGenerateImage={handleGenerateImage} />
          </div>
        </main>
      </div>

      <ExternalToolModal 
        isOpen={externalTool.isOpen} onClose={() => setExternalTool({ isOpen: false, type: null })}
        url={externalTool.type === 'mind' ? 'https://geminigen.ai' : ''} title="GeminiGen AI" icon={<BrainCircuit className="w-5 h-5"/>}
      />
      
      <ExcelImportModal 
        isOpen={excelModalOpen} onClose={() => setExcelModalOpen(false)}
        onImport={handleExcelImport} onSave={(rawData, mapping) => { setMasterLibrary(rawData); setColumnMapping(mapping); }}
        savedData={masterLibrary} savedMapping={columnMapping}
      />

      <PromptHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        savedPrompts={savedPrompts}
        onDelete={(id) => setSavedPrompts(prev => prev.filter(p => p.id !== id))}
      />

      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        savedApiKey={userApiKey}
        onSave={setUserApiKey}
      />
    </div>
  );
};

export default App;
