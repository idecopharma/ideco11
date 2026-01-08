
import React, { useState } from 'react';
import { ProductForm } from './components/ProductForm.tsx';
import { ResultDisplay } from './components/ResultDisplay.tsx';
import { ExternalToolModal } from './components/ExternalToolModal.tsx';
import { ExcelImportModal } from './components/ExcelImportModal.tsx';
import { ProductData, GeneratedResult, AppState, ExcelMapping } from './types.ts';
import { generateOptimizedPrompt, processProductImageAI } from './services/geminiService.ts';
import { PenTool, BrainCircuit, Table, Image as ImageIcon } from 'lucide-react';
import useLocalStorage from './hooks/useLocalStorage.ts';

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
    createEmptyProduct(3)
  ]);
  
  const [activeTab, setActiveTab] = useState<number>(1);
  const [results, setResults] = useState<GeneratedResult[]>([
    { id: 1, prompt: '', status: 'pending' },
    { id: 2, prompt: '', status: 'pending' },
    { id: 3, prompt: '', status: 'pending' }
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
      const processedBase64 = await processProductImageAI(product.imageBase64, product.mimeType, task);
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
    if (!process.env.API_KEY) {
        alert("Thiếu API Key.");
        return;
    }

    setAppState(AppState.PROCESSING);
    setResults(prev => prev.map(r => {
        const prod = products.find(p => p.id === r.id);
        if (prod && prod.name) return { ...r, status: 'loading', prompt: '' };
        return r;
    }));

    const promises = products.map(async (product) => {
      if (!product.name) return;
      try {
        const prompt = await generateOptimizedPrompt(product);
        setResults(prev => prev.map(r => r.id === product.id ? { ...r, prompt, status: 'success' } : r));
      } catch (error) {
        setResults(prev => prev.map(r => r.id === product.id ? { ...r, prompt: String(error), status: 'error' } : r));
      }
    });

    await Promise.all(promises);
    setAppState(AppState.COMPLETE);
  };

  const handleExcelImport = (importedProducts: ProductData[], rawData: any[], mapping: ExcelMapping) => {
    setMasterLibrary(rawData);
    setColumnMapping(mapping);
    setProducts(prev => {
        const newProducts = [...prev];
        importedProducts.forEach((imp, index) => {
            if (index < 3) {
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
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">Pharma Poster AI</h1>
              <p className="text-slate-500 text-sm font-medium">Hệ thống tạo Prompt marketing thuốc chuyên nghiệp</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setExcelModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-white text-emerald-700 font-black rounded-xl shadow-sm border-2 border-emerald-100 hover:bg-emerald-50 transition-all active:scale-95 uppercase text-xs tracking-wider"><Table className="w-5 h-5" /> Quản lý Bảng Giá</button>
            <button onClick={() => window.open('https://lmarena.ai/', '_blank')} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black rounded-xl shadow-lg shadow-pink-100 hover:shadow-pink-200 transition-all active:scale-95 uppercase text-xs tracking-wider"><ImageIcon className="w-5 h-5" /> Vẽ Ảnh AI</button>
            <button onClick={() => setExternalTool({ isOpen: true, type: 'mind' })} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black rounded-xl shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all active:scale-95 uppercase text-xs tracking-wider"><BrainCircuit className="w-5 h-5" /> Mind AI</button>
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
            <ResultDisplay results={results} appState={appState} />
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
    </div>
  );
};

export default App;
