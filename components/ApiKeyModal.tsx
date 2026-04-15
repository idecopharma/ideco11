import React, { useState, useEffect } from 'react';
import { X, Key, Check } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedApiKey: string;
  onSave: (apiKey: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  savedApiKey,
  onSave
}) => {
  const [apiKey, setApiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiKey(savedApiKey);
      setIsSaved(false);
    }
  }, [isOpen, savedApiKey]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(apiKey.trim());
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-600" />
            Cấu Hình API Key
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-slate-600 mb-4">
            Nhập Gemini API Key của bạn để sử dụng tính năng tạo ảnh trực tiếp. Nếu để trống, hệ thống sẽ sử dụng API Key mặc định (nếu có).
          </p>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Gemini API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-6 py-2 text-sm font-bold text-white rounded-lg transition-all ${
              isSaved ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isSaved ? <Check className="w-4 h-4" /> : <Key className="w-4 h-4" />}
            {isSaved ? 'Đã Lưu' : 'Lưu API Key'}
          </button>
        </div>
      </div>
    </div>
  );
};
