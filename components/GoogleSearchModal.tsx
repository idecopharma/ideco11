import React from 'react';
import { X, Search } from 'lucide-react';

interface GoogleSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  drugName: string;
}

export const GoogleSearchModal: React.FC<GoogleSearchModalProps> = ({ isOpen, onClose, drugName }) => {
  if (!isOpen) return null;

  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(drugName + ' product image')}&tbm=isch`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Search className="w-5 h-5 text-indigo-600" />
            Tìm kiếm ảnh: {drugName}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <iframe
            src={searchUrl}
            className="w-full h-full border-0"
            title={`Tìm kiếm ảnh cho ${drugName}`}
          />
        </div>
      </div>
    </div>
  );
};
