
import React, { useState } from 'react';
import { ProductForm } from './components/ProductForm';
import { ResultDisplay } from './components/ResultDisplay';
import { ExternalToolModal } from './components/ExternalToolModal';
import { ExcelImportModal } from './components/ExcelImportModal';
import { ProductData, GeneratedResult, AppState, ExcelMapping } from './types';
import { generateOptimizedPrompt, processImageWithAI } from './services/geminiService';
import { PenTool, BrainCircuit, Sparkles, Bot, Table, Image as ImageIcon } from 'lucide-react';
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
    createEmptyProduct(3)
  ]);
  
  const [activeTab, setActiveTab] = useState<number>(1);
  const [results, setResults] = useState<GeneratedResult[]>([
    { id: 1, prompt: '', status: 'pending' },
    { id: 2, prompt: '', status: 'pending' },
    { id: 3, prompt: '', status: 'pending' }
  ]);
  
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [imageLoading, setImageLoading] = useState<Record<number, boolean>>({});

  const [masterLibrary, setMasterLibrary] = useLocalStorage<any[]>('excelMasterLibrary', []);
  const [columnMapping, setColumnMapping] = useLocalStorage<ExcelMapping>('excelColumnMapping', {
    name: '', dosage: '', usage: '', listPrice: '', idecoPrice: '', manufacturer: '', packaging: ''
  });

  const [externalTool, setExternalTool] = useState<{ isOpen: boolean; type: 'gen' | 'mind' | 'image' | null }>({
    isOpen: false,
    type: null
  });
  
  const [excelModalOpen, setExcelModalOpen] = useState(false);

  const handleFieldChange = (id: number, field: keyof ProductData, value: string | boolean) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleImageUpload = (id: number, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setProducts(prev => prev.map(p => p.id === id ? { 
        ...p, 
        imageBase64: base64String,
        mimeType: file.type
      } : p));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (id: number) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, imageBase64: undefined, mimeType: undefined } : p));
  };

  // AI Image Processing Action
  const handleAIImageAction = async (id: number, task: 'remove_bg' | 'make_3d') => {
    const product = products.find(p => p.id === id);
    if (!product?.imageBase64 || !product?.mimeType) return;

    setImageLoading(prev => ({ ...prev, [id]: true }));
    try {
      const processedImage = await processImageWithAI(product.imageBase64, product.mimeType, task);
      setProducts(prev => prev.map(p => p.id === id ? { ...p, imageBase64: processedImage, mimeType: 'image/png' } : p));
    } catch (error) {
      alert("Lỗi xử lý ảnh bằng AI: " + (error instanceof Error ? error.message : "Vui lòng thử lại."));
    } finally {
      setImageLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleGenerateAll = async () => {
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
    const formatPrice = (val: any) => typeof val === 'number' ? val.toLocaleString('vi-VN') + ' đ' : (val || '');
    const packaging = libraryItem[columnMapping.packaging] ? String(libraryItem[columnMapping.packaging]) : '';
    
    setProducts(prev => prev.map(p => p.id === productIndex ? { 
        ...p, 
        name: String(libraryItem[columnMapping.name] || ''),
        dosage: String(libraryItem[columnMapping.dosage] || ''),
        usage: String(libraryItem[columnMapping.usage] || ''),
        listPrice: formatPrice(libraryItem[columnMapping.listPrice]) + (packaging ? ` / ${packaging}` : ''),
        idecoPrice: formatPrice(libraryItem[columnMapping.idecoPrice]) + (packaging ? ` / ${packaging}` : ''),
        manufacturer: String(libraryItem[columnMapping.manufacturer] || ''),
    } : p));
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row items-center justify-between pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg">
              <PenTool className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">Pharma Poster AI</h1>
              <p className="text-slate-500 text-sm font-medium">Tạo prompt & xử lý ảnh dược phẩm 3D</p>
            </div>
          </div>
          <div className="flex gap-3">
             <button onClick={() => setExcelModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white text-emerald-700 font-semibold rounded-lg shadow-sm border border-emerald-200 hover:bg-emerald-50 transition-all"><Table className="w-5 h-5" /><span>Nhập Excel</span></button>
             <button onClick={() => setExternalTool({ isOpen: true, type: 'image' })} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold rounded-lg shadow-md transition-all"><ImageIcon className="w-5 h-5" /><span>LM Arena</span></button>
             <button onClick={() => setExternalTool({ isOpen: true, type: 'mind' })} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg shadow-md transition-all"><BrainCircuit className="w-5 h-5" /><span>Mind</span></button>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 h-[850px]">
            <ProductForm 
              products={products}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onChange={handleFieldChange}
              onImageUpload={handleImageUpload}
              onRemoveImage={handleRemoveImage}
              onSubmit={handleGenerateAll}
              isProcessing={appState === AppState.PROCESSING}
              masterLibrary={masterLibrary}
              columnMapping={columnMapping}
              onApplyLibraryProduct={handleApplyProductFromLibrary}
              imageLoading={imageLoading[activeTab]}
              onAIAction={(task) => handleAIImageAction(activeTab, task)}
            />
          </div>
          <div className="lg:col-span-5 h-[850px]">
            <ResultDisplay results={results} appState={appState} />
          </div>
        </main>
      </div>

      <ExternalToolModal 
        isOpen={externalTool.isOpen} 
        onClose={() => setExternalTool({ isOpen: false, type: null })}
        url="https://lmarena.ai/"
        title="LM Arena AI"
      />
      
      <ExcelImportModal 
        isOpen={excelModalOpen} 
        onClose={() => setExcelModalOpen(false)}
        onImport={handleExcelImport}
        onSave={(data, mapping) => { setMasterLibrary(data); setColumnMapping(mapping); }}
        savedData={masterLibrary}
        savedMapping={columnMapping}
      />
    </div>
  );
};

export default App;
