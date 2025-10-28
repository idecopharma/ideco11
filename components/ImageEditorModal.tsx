import React, { useState, useEffect, useRef, useCallback } from 'react';
import Spinner from './Spinner';
import { PaintBrushIcon, EraserIcon, ArrowUturnLeftIcon, TrashIcon, ArrowUturnRightIcon } from './Icons';
import { useHistory } from '../hooks/useHistory';

interface ImageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onApply: (maskBase64: string, prompt: string) => void;
  isApplying: boolean;
  error: string | null;
}

const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ isOpen, onClose, imageSrc, onApply, isApplying, error }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const isDrawing = useRef(false);
  const lastPosition = useRef<{ x: number; y: number } | null>(null);
  const pathPoints = useRef<Array<{ x: number; y: number }>>([]);
  
  const {
    state: presentImageData,
    set: setHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    reset: resetHistory,
  } = useHistory<ImageData | null>(null);

  const [prompt, setPrompt] = useState('');
  const [brushSize, setBrushSize] = useState(40);
  const [mode, setMode] = useState<'draw' | 'erase'>('draw');

  // Effect to re-sync canvas if the history state changes (e.g., on undo/redo)
  useEffect(() => {
    if (presentImageData) {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx) {
            if (canvas.width !== presentImageData.width || canvas.height !== presentImageData.height) {
                canvas.width = presentImageData.width;
                canvas.height = presentImageData.height;
            }
            ctx.putImageData(presentImageData, 0, 0);
        }
    }
  }, [presentImageData]);


  // Effect to set up the canvas when the modal opens or the image source changes
  useEffect(() => {
    if (!isOpen) return;

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = imageSrc;

    const setupCanvas = () => {
      if (!imageRef.current || !containerRef.current || !canvasRef.current) return;
      
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;

      const imageAspectRatio = image.naturalWidth / image.naturalHeight;
      const containerAspectRatio = containerWidth / containerHeight;

      let newWidth, newHeight;

      if (imageAspectRatio > containerAspectRatio) {
        newWidth = containerWidth;
        newHeight = containerWidth / imageAspectRatio;
      } else {
        newHeight = containerHeight;
        newWidth = containerHeight * imageAspectRatio;
      }
      
      imageRef.current.style.width = `${newWidth}px`;
      imageRef.current.style.height = `${newHeight}px`;
      canvasRef.current.width = newWidth;
      canvasRef.current.height = newHeight;

      // Initialize history with a blank canvas
      const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
      if (ctx) {
          ctx.clearRect(0, 0, newWidth, newHeight);
          resetHistory(ctx.getImageData(0, 0, newWidth, newHeight));
      }
    };

    image.onload = setupCanvas;
    window.addEventListener('resize', setupCanvas);
    return () => {
      window.removeEventListener('resize', setupCanvas);
    };
  }, [isOpen, imageSrc, resetHistory]);

  const getCoordinates = (event: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return null;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in event) {
        if (event.touches.length === 0) return null;
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
    } else {
        clientX = event.clientX;
        clientY = event.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (event: React.MouseEvent | React.TouchEvent) => {
    if ('button' in event && event.button !== 0) return; // Only allow left-clicks
    const coords = getCoordinates(event);
    if (!coords) return;
    
    isDrawing.current = true;
    lastPosition.current = coords;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    
    if (mode === 'draw') {
        pathPoints.current = [coords];
    } else { // Erase mode
        ctx.beginPath();
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'destination-out';
        ctx.moveTo(coords.x, coords.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
    }
  };

  const draw = (event: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    const coords = getCoordinates(event);
    if (!coords) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    if (mode === 'draw') {
        if (!presentImageData) return;
        pathPoints.current.push(coords);
        
        ctx.putImageData(presentImageData, 0, 0); // Restore previous state
        
        // Draw temporary path outline
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        pathPoints.current.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.stroke();
        ctx.setLineDash([]);

    } else { // Erase mode
        if (!lastPosition.current) return;
        ctx.beginPath();
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'destination-out';
        ctx.moveTo(lastPosition.current.x, lastPosition.current.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
        lastPosition.current = coords;
    }
  };

  const stopDrawing = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    
    if (mode === 'draw') {
        if (presentImageData) {
            ctx.putImageData(presentImageData, 0, 0); // Restore to clear temp path
        }
        if (pathPoints.current.length > 1) {
            ctx.beginPath();
            pathPoints.current.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
            ctx.closePath();
            
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; // Use a high-alpha fill
            ctx.fill();
        }
        pathPoints.current = [];
    }
    
    lastPosition.current = null;
    setHistory(ctx.getImageData(0, 0, canvas.width, canvas.height));
  };
  
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHistory(ctx.getImageData(0, 0, canvas.width, canvas.height));
    }
  }, [setHistory]);

  const handleApply = () => {
    if (!canvasRef.current) return;
    const originalCanvas = canvasRef.current;
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = originalCanvas.width;
    maskCanvas.height = originalCanvas.height;
    const maskCtx = maskCanvas.getContext('2d');
    
    if (!maskCtx) return;

    maskCtx.fillStyle = 'black';
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    maskCtx.drawImage(originalCanvas, 0, 0);
    const maskBase64 = maskCanvas.toDataURL('image/png').split(',')[1];
    onApply(maskBase64, prompt);
  };
  
  const isMaskEmpty = () => {
    if (!presentImageData) return true;
    for (let i = 3; i < presentImageData.data.length; i += 4) {
        if (presentImageData.data[i] > 0) return false;
    }
    return true;
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full h-full max-w-7xl max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-4 flex-shrink-0 border-b">
            <h3 className="text-xl font-bold text-gray-900">Chỉnh sửa ảnh</h3>
            {error && (
                <div className="mt-2 text-center text-red-600 bg-red-50 p-2 rounded-lg text-sm">
                    <p>{error}</p>
                </div>
            )}
        </div>
        
        <div className="p-6 flex-grow grid grid-cols-1 md:grid-cols-3 gap-6 min-h-0">
          <div className="flex flex-col gap-4 bg-gray-50 p-4 rounded-lg">
             <div>
                <label className="block text-sm font-medium text-gray-700">Công cụ</label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                    <button onClick={() => setMode('draw')} className={`p-2 rounded-md flex items-center justify-center gap-2 border-2 ${mode === 'draw' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white hover:bg-gray-100 border-gray-300'}`}><PaintBrushIcon className="w-5 h-5" /> Chọn vùng</button>
                    <button onClick={() => setMode('erase')} className={`p-2 rounded-md flex items-center justify-center gap-2 border-2 ${mode === 'erase' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white hover:bg-gray-100 border-gray-300'}`}><EraserIcon className="w-5 h-5" /> Tẩy</button>
                </div>
             </div>
             {mode === 'erase' && (
                <div>
                    <label htmlFor="brush-size" className="block text-sm font-medium text-gray-700">Kích thước cọ: {brushSize}px</label>
                    <input id="brush-size" type="range" min="5" max="100" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                </div>
             )}
             <div>
                <label className="block text-sm font-medium text-gray-700">Lịch sử</label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                    <button onClick={undo} disabled={!canUndo} className="p-2 rounded-md flex items-center justify-center gap-2 border-2 bg-white hover:bg-gray-100 border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"><ArrowUturnLeftIcon className="w-5 h-5" /> Hoàn tác</button>
                    <button onClick={redo} disabled={!canRedo} className="p-2 rounded-md flex items-center justify-center gap-2 border-2 bg-white hover:bg-gray-100 border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"><ArrowUturnRightIcon className="w-5 h-5" /> Làm lại</button>
                </div>
             </div>
             <div>
                <button onClick={clearCanvas} className="w-full p-2 rounded-md flex items-center justify-center gap-2 border-2 bg-white hover:bg-gray-100 border-gray-300"><TrashIcon className="w-5 h-5" /> Xóa vùng chọn</button>
             </div>
             <div className="flex-grow flex flex-col">
                <label htmlFor="edit-prompt" className="block text-sm font-medium text-gray-700">Mô tả thay đổi</label>
                <textarea 
                    id="edit-prompt" 
                    value={prompt} 
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="VD: thêm một chiếc mũ màu đỏ, xóa người này, thay đổi bầu trời..."
                    className="mt-1 w-full flex-grow p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
             </div>
          </div>

          <div ref={containerRef} className="md:col-span-2 relative flex justify-center items-center bg-gray-200 rounded-lg overflow-hidden">
            {isApplying && (
                 <div className="absolute inset-0 bg-white/80 z-20 flex flex-col justify-center items-center rounded-lg">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                    <p className="mt-3 font-semibold text-gray-700">Đang áp dụng thay đổi...</p>
                 </div>
            )}
            <div className="relative">
                <img ref={imageRef} src={imageSrc} alt="To be edited" className="block max-w-full max-h-full object-contain pointer-events-none" />
                <canvas 
                    ref={canvasRef} 
                    className="absolute top-0 left-0 cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 p-6 border-t flex-shrink-0">
          <button type="button" onClick={onClose} disabled={isApplying} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200">Hủy</button>
          <button type="button" onClick={handleApply} disabled={isApplying || !prompt.trim() || isMaskEmpty()} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed">
            {isApplying && <Spinner />}
            Áp dụng thay đổi
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageEditorModal;
