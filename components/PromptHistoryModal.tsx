import React from 'react';
import { X, Trash2, Copy, Check, Clock } from 'lucide-react';
import { SavedPrompt } from '../types';

interface PromptHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedPrompts: SavedPrompt[];
  onDelete: (id: string) => void;
}

export const PromptHistoryModal: React.FC<PromptHistoryModalProps> = ({
  isOpen,
  onClose,
  savedPrompts,
  onDelete
}) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (id: string, prompt: string) => {
    navigator.clipboard.writeText(prompt);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            Lịch Sử Prompt Đã Tạo
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-100/50">
          {savedPrompts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
              <Clock className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">Chưa có prompt nào được lưu.</p>
              <p className="text-sm mt-2">Các prompt tạo thành công sẽ tự động xuất hiện ở đây.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {savedPrompts.map((item) => (
                <div key={item.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-slate-800">{item.productName || 'Sản phẩm không tên'}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{formatDate(item.timestamp)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopy(item.id, item.prompt)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors border
                          ${copiedId === item.id 
                            ? 'text-green-700 bg-green-50 border-green-200' 
                            : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50 hover:text-indigo-600'}`}
                      >
                        {copiedId === item.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedId === item.id ? 'Đã sao chép' : 'Sao chép'}
                      </button>
                      <button
                        onClick={() => onDelete(item.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-red-600 bg-white border border-red-200 hover:bg-red-50 transition-colors"
                        title="Xóa prompt này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Xóa
                      </button>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-900 overflow-x-auto custom-scrollbar">
                    <pre className="text-sm font-mono text-indigo-200 whitespace-pre-wrap leading-relaxed">
                      {item.prompt}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
