import React, { useState } from 'react';
import type { UploadedFile } from '../types';
import { SearchIcon, UploadIcon } from './Icons';

interface ImageSearcherProps {
  onImageSelect: (file: UploadedFile) => void;
}

const ImageSearcher: React.FC<ImageSearcherProps> = ({ onImageSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    const searchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(searchQuery)}`;
    window.open(searchUrl, '_blank');
  };

  const handleLoadFromUrl = async () => {
    if (!imageUrl.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const loadImageAsBase64 = (url: string): Promise<string> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                reject(new Error('Could not get canvas context.'));
                return;
              }
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL('image/png').split(',')[1]);
            } catch (e) {
              console.error('Canvas tainted by CORS:', e);
              reject(new Error('Không thể xử lý ảnh này do chính sách bảo mật (CORS). Vui lòng lưu ảnh về máy tính rồi upload thủ công.'));
            }
          };
          
          img.onerror = () => {
            reject(new Error('Không thể tải hình ảnh từ liên kết này. Liên kết có thể bị hỏng hoặc không phải là ảnh trực tiếp.'));
          };
          
          img.src = url;
        });
      };

      const base64 = await loadImageAsBase64(imageUrl);
      const file: UploadedFile = {
        name: `${imageUrl.substring(imageUrl.lastIndexOf('/') + 1).slice(0, 20) || 'downloaded_image'}.png`,
        type: 'image/png',
        size: 0, // Size is not available from this method
        base64: base64,
      };
      onImageSelect(file);
      setImageUrl('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Tìm ảnh trên Google</h3>
        <p className="text-sm text-gray-500 mb-2">
          Mở Google Hình ảnh trong tab mới để tìm kiếm. Sau đó, sao chép địa chỉ hình ảnh và dán vào ô bên dưới.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            placeholder="e.g., a beautiful landscape with mountains"
            className="flex-grow w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          <button
            onClick={handleSearch}
            disabled={!searchQuery.trim()}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed"
            aria-label="Search"
          >
            <SearchIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Tải ảnh từ liên kết</h3>
        <div className="flex gap-2">
            <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleLoadFromUrl(); }}
                placeholder="Dán địa chỉ hình ảnh (URL) vào đây..."
                className="flex-grow w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                disabled={isLoading}
            />
            <button
                onClick={handleLoadFromUrl}
                disabled={isLoading || !imageUrl.trim()}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-300 disabled:cursor-not-allowed"
                aria-label="Load Image"
            >
                {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                    <UploadIcon className="w-5 h-5" />
                )}
            </button>
        </div>
      </div>

      {error && (
        <div className="mt-2 text-center text-red-600 bg-red-50 p-3 rounded-lg text-sm">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

export default ImageSearcher;
