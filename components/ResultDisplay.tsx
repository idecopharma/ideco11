
import React from 'react';
import { Copy, Check, Sparkles, Terminal, AlertTriangle } from 'lucide-react';
import { GeneratedResult, AppState } from '../types';

interface ResultDisplayProps {
  results: GeneratedResult[];
  appState: AppState;
}

const PromptItem: React.FC<{ result: GeneratedResult }> = ({ result }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(result.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (result.status === 'loading') {
    return (
      <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm animate-pulse mb-4">
        <div className="h-4 bg-slate-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-2">
          <div className="h-3 bg-slate-100 rounded"></div>
          <div className="h-3 bg-slate-100 rounded"></div>
          <div className="h-3 bg-slate-100 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (result.status === 'error') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
          <div className="overflow-hidden w-full">
            <h3 className="font-bold text-red-700 flex items-center gap-2">
              Lỗi Tạo Prompt (SP {result.id})
            </h3>
            <p className="text-red-600 text-sm mt-1 whitespace-pre-wrap break-words">
              {result.prompt}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (result.status === 'pending') {
    return null; 
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow mb-4">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
            {result.id}
          </span>
          Prompt Sản phẩm {result.id}
        </h3>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors border
            ${copied 
              ? 'text-green-700 bg-green-50 border-green-200' 
              : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50 hover:text-indigo-600'}`}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Đã sao chép' : 'Sao chép'}
        </button>
      </div>
      <div className="p-4 bg-slate-900 overflow-x-auto custom-scrollbar">
        <pre className="text-sm font-mono text-indigo-200 whitespace-pre-wrap leading-relaxed">
          {result.prompt}
        </pre>
      </div>
    </div>
  );
};

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ results, appState }) => {
  const hasResults = results.some(r => r.status === 'success' || r.status === 'error');

  if (appState === AppState.IDLE && !hasResults) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 h-full flex flex-col items-center justify-center text-center text-slate-400 border-2 border-dashed border-slate-200">
        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
          <Terminal className="w-10 h-10 text-indigo-300" />
        </div>
        <p className="text-lg font-medium text-slate-600">Trình Tạo Prompt Thông Minh</p>
        <p className="text-sm max-w-xs mx-auto mt-2">
          Nhập thông tin cho 3 sản phẩm, upload ảnh thật, và AI sẽ viết 3 prompt chuẩn xác để bạn tạo poster.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto custom-scrollbar pr-1 pb-4">
      <div className="flex items-center justify-between mb-4 sticky top-0 bg-slate-100 py-2 z-10">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          Kết Quả Prompts
        </h2>
        {hasResults && (
           <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">
             Sẵn sàng để copy
           </span>
        )}
      </div>

      {results.map((result) => (
        <PromptItem key={result.id} result={result} />
      ))}
    </div>
  );
};
