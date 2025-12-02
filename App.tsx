
import React, { useState } from 'react';
import { ProductForm } from './components/ProductForm';
import { ResultDisplay } from './components/ResultDisplay';
import { ExternalToolModal } from './components/ExternalToolModal';
import { ProductData, GeneratedResult, AppState } from './types';
import { generateOptimizedPrompt } from './services/geminiService';
import { PenTool, BrainCircuit, Sparkles, Bot } from 'lucide-react';

// Initial Empty Product
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
  aspectRatio: 'vertical' // Default to vertical
});

const App: React.FC = () => {
  // State for 3 products
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

  // External Tool Modal State
  const [externalTool, setExternalTool] = useState<{ isOpen: boolean; type: 'gen' | 'mind' | null }>({
    isOpen: false,
    type: null
  });

  const handleFieldChange = (id: number, field: keyof ProductData, value: string | boolean) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  // Handle Image Upload and conversion to Base64
  const handleImageUpload = (id: number, file: File) => {
    // Check file size (limit to 5MB roughly)
    if (file.size > 5 * 1024 * 1024) {
      alert("Ảnh quá lớn. Vui lòng chọn ảnh dưới 5MB.");
      return;
    }

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

  const handleGenerateAll = async () => {
    if (!process.env.API_KEY) {
        alert("Vui lòng cấu hình API Key. (Environment variable API_KEY is missing)");
        return;
    }

    setAppState(AppState.PROCESSING);
    
    // Set all relevant statuses to loading
    setResults(prev => prev.map(r => {
        const prod = products.find(p => p.id === r.id);
        // Only load if product has a name at least
        if (prod && prod.name) return { ...r, status: 'loading', prompt: '' };
        return r;
    }));

    // Process all products that have at least a Name filled in
    const promises = products.map(async (product) => {
      if (!product.name) return; // Skip empty products

      try {
        const prompt = await generateOptimizedPrompt(product);
        setResults(prev => prev.map(r => r.id === product.id ? { ...r, prompt, status: 'success' } : r));
      } catch (error) {
        // Capture the error message to display in the UI
        const errorMessage = error instanceof Error ? error.message : String(error);
        setResults(prev => prev.map(r => r.id === product.id ? { ...r, prompt: errorMessage, status: 'error' } : r));
      }
    });

    await Promise.all(promises);
    setAppState(AppState.COMPLETE);
  };

  const openTool = (type: 'gen' | 'mind') => {
    setExternalTool({ isOpen: true, type });
  };

  const closeTool = () => {
    setExternalTool({ isOpen: false, type: null });
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row items-center justify-between pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg">
              <PenTool className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
                Pharma Prompt Generator
              </h1>
              <p className="text-slate-500 text-sm font-medium">
                Tạo prompt hàng loạt (3 SP) kèm phân tích hình ảnh AI
              </p>
            </div>
          </div>

          {/* Right Side Tools */}
          <div className="flex gap-3">
            <button
              onClick={() => openTool('mind')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              <BrainCircuit className="w-5 h-5" />
              <span>Mind</span>
            </button>
          </div>
        </header>

        {/* Main Grid */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left: Input Form (Spans 7 columns) */}
          <div className="lg:col-span-7 h-[800px]">
            <ProductForm 
              products={products}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onChange={handleFieldChange}
              onImageUpload={handleImageUpload}
              onRemoveImage={handleRemoveImage}
              onSubmit={handleGenerateAll}
              isProcessing={appState === AppState.PROCESSING}
            />
          </div>

          {/* Right: Results (Spans 5 columns) */}
          <div className="lg:col-span-5 h-[800px]">
            <ResultDisplay 
              results={results}
              appState={appState}
            />
          </div>

        </main>
      </div>

      {/* External Tool Modal */}
      <ExternalToolModal 
        isOpen={externalTool.isOpen}
        onClose={closeTool}
        url={externalTool.type === 'gen' ? 'https://lmarena.ai/' : 'https://geminigen.ai'}
        title={externalTool.type === 'gen' ? 'LM Arena' : 'GeminiGen AI'}
        icon={externalTool.type === 'gen' ? <Bot className="w-5 h-5"/> : <BrainCircuit className="w-5 h-5"/>}
      />
    </div>
  );
};

export default App;
