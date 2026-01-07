import React, { useState } from 'react';
import { Download, Maximize2, X, Share2, Sparkles } from 'lucide-react';
import { GeneratedImage, LoadingState } from '../types';
import Button from './Button';

interface GeneratedDisplayProps {
  image: GeneratedImage | null;
  loadingState: LoadingState;
  onDownload: (url: string, id: string) => void;
}

const GeneratedDisplay: React.FC<GeneratedDisplayProps> = ({ image, loadingState, onDownload }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Helper to handle download
  const handleDownload = () => {
    if (image) onDownload(image.url, image.id);
  };

  // Render Loading State
  if (loadingState === 'generating' || loadingState === 'enhancing') {
    return (
      <div className="w-full aspect-square md:aspect-[4/3] bg-surface/30 border border-slate-700/50 rounded-2xl flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-secondary/10 animate-pulse-slow"></div>
        
        <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 mb-6 relative">
                 <div className="absolute inset-0 rounded-full border-4 border-slate-700"></div>
                 <div className="absolute inset-0 rounded-full border-t-4 border-primary animate-spin"></div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
                {loadingState === 'enhancing' ? 'Đang tối ưu prompt...' : 'Đang vẽ tác phẩm của bạn...'}
            </h3>
            <p className="text-slate-400 max-w-md">
                Gemini đang sử dụng sức mạnh sáng tạo để biến ý tưởng của bạn thành hiện thực. Quá trình này thường mất khoảng 5-10 giây.
            </p>
        </div>
      </div>
    );
  }

  // Render Empty State
  if (!image) {
    return (
      <div className="w-full aspect-square md:aspect-[4/3] bg-surface/30 border border-slate-700/50 rounded-2xl flex flex-col items-center justify-center p-8 text-center border-dashed">
        <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mb-4 text-slate-500">
            <Sparkles size={32} />
        </div>
        <h3 className="text-lg font-medium text-slate-300 mb-1">Chưa có ảnh nào được tạo</h3>
        <p className="text-slate-500 text-sm">Nhập mô tả và nhấn "Tạo ảnh" để bắt đầu</p>
      </div>
    );
  }

  // Render Image Result
  return (
    <div className="relative group w-full bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-slate-700/50">
      <img 
        src={image.url} 
        alt={image.prompt} 
        className={`w-full h-auto object-contain max-h-[70vh] mx-auto transition-opacity duration-500 ${loadingState === 'idle' ? 'opacity-100' : 'opacity-50'}`}
      />
      
      {/* Overlay Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-between">
        <div className="flex-1 mr-4">
            <p className="text-white text-sm font-medium line-clamp-2 drop-shadow-md">{image.prompt}</p>
        </div>
        <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setIsFullscreen(true)} className="!p-2 !rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border-white/10">
                <Maximize2 size={20} />
            </Button>
            <Button variant="primary" onClick={handleDownload} className="!p-2 !rounded-full">
                <Download size={20} />
            </Button>
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4">
            <button 
                onClick={() => setIsFullscreen(false)}
                className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
            >
                <X size={32} />
            </button>
            <img 
                src={image.url} 
                alt={image.prompt} 
                className="max-w-full max-h-full object-contain shadow-2xl"
            />
             <div className="absolute bottom-8 flex gap-4">
                 <Button variant="primary" onClick={handleDownload} icon={<Download size={20} />}>
                    Tải về
                 </Button>
             </div>
        </div>
      )}
    </div>
  );
};

export default GeneratedDisplay;