import React from 'react';
import { XMarkIcon } from './Icons';

interface IframeModalProps {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string;
  title: string;
  id?: string;
}

const IframeModal: React.FC<IframeModalProps> = ({ isOpen, onClose, htmlContent, title, id }) => {
  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 ${isOpen ? '' : 'hidden'}`}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white rounded-lg shadow-xl w-[1000px] h-[900px] max-w-full max-h-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors"
            aria-label="Close modal"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-grow overflow-hidden">
          <iframe
            id={id}
            srcDoc={htmlContent}
            className="w-full h-full border-0"
            title={title}
            sandbox="allow-scripts allow-same-origin allow-downloads allow-popups allow-popups-to-escape-sandbox"
          />
        </div>
      </div>
    </div>
  );
};

export default IframeModal;