import React from 'react';
import { WrenchScrewdriverIcon, ViewColumnsIcon } from './Icons';

interface HeaderProps {
    onToolButtonClick?: () => void;
    onQuoteToolButtonClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToolButtonClick, onQuoteToolButtonClick }) => {
  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-4 md:px-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">
          MINH TRIET <span className="text-indigo-600">AI DESIGN</span>
        </h1>
        <div className="flex items-center gap-2">
            {onQuoteToolButtonClick && (
                 <button
                    onClick={onQuoteToolButtonClick}
                    className="p-2 rounded-full text-blue-600 hover:bg-blue-100 hover:text-blue-800 transition-colors"
                    title="Tạo Bảng Báo Giá"
                    aria-label="Open quote generator tool"
                >
                    <ViewColumnsIcon className="w-7 h-7" />
                </button>
            )}
            {onToolButtonClick && (
                <button
                    onClick={onToolButtonClick}
                    className="p-2 rounded-full text-red-600 hover:bg-red-100 hover:text-red-800 transition-colors"
                    title="Công cụ chỉnh sửa ảnh"
                    aria-label="Open image editing tool"
                >
                    <WrenchScrewdriverIcon className="w-7 h-7" />
                </button>
            )}
        </div>
      </div>
    </header>
  );
};

export default Header;