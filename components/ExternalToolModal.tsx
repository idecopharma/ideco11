
import React from 'react';
import { X, ExternalLink, Globe } from 'lucide-react';

interface ExternalToolModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  icon?: React.ReactNode;
}

export const ExternalToolModal: React.FC<ExternalToolModalProps> = ({ isOpen, onClose, url, title, icon }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 md:p-4">
      <div className="bg-white w-full h-full md:w-[95vw] md:h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-300 animate-in fade-in zoom-in duration-200">
        
        {/* Browser-like Header */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center justify-between shrink-0 h-14">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-white rounded-md border border-slate-200 shadow-sm text-indigo-600">
               {icon || <Globe className="w-5 h-5" />}
            </div>
            <div className="flex flex-col">
                <h3 className="font-bold text-slate-700 text-sm md:text-base leading-tight">{title}</h3>
                <span className="text-xs text-slate-400 truncate max-w-[200px] md:max-w-md">{url}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <a 
                href={url} 
                target="_blank" 
                rel="noreferrer"
                className="hidden md:flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
            >
                <ExternalLink className="w-3.5 h-3.5" />
                Mở Tab Mới
            </a>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-slate-50 relative w-full h-full">
            <iframe 
                src={url} 
                title={title}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
            
            {/* Disclaimer overlay for sites that block iframes */}
            <div className="absolute inset-0 -z-10 flex flex-col items-center justify-center text-slate-400">
                <p>Đang tải trang web...</p>
                <p className="text-xs mt-2">Nếu trang trắng, vui lòng bấm nút "Mở Tab Mới" ở góc phải.</p>
            </div>
        </div>
      </div>
    </div>
  );
};
