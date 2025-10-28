import React, { useState, useEffect } from 'react';
import Modal from './Modal';

const stripBase64Prefix = (base64: string) => {
    const parts = base64.split(',');
    return parts.length > 1 ? parts[1] : parts[0];
};

const utf8_to_b64 = (str: string) => {
    try {
        return window.btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
        console.error('Base64 encoding failed:', e);
        return '';
    }
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  generatedImage: string;
  prompt: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, generatedImage, prompt }) => {
  const [shareUrl, setShareUrl] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsCopied(false);
      
      try {
        const imageData = stripBase64Prefix(generatedImage);
        const shareData = {
          image: imageData,
          prompt: prompt,
        };
        const dataString = JSON.stringify(shareData);
        const encodedData = utf8_to_b64(dataString);

        if (encodedData) {
            const url = `${window.location.origin}${window.location.pathname}#share=${encodedData}`;
            setShareUrl(url);
        } else {
            setShareUrl('Could not generate share link.');
        }

      } catch (e) {
        console.error("Error creating share link:", e);
        setShareUrl('Could not generate share link.');
      }
    }
  }, [isOpen, generatedImage, prompt]);

  const handleCopy = () => {
    if (!shareUrl.startsWith('http')) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }, (err) => {
      console.error('Could not copy text: ', err);
    });
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-2">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Share Your Creation</h3>
        
        <p className="text-sm text-gray-600 mb-2">
          Anyone with this link will be able to view your generated image and the prompt used to create it.
        </p>

        <img 
            src={generatedImage} 
            alt="Shared content preview" 
            className="w-full h-48 object-contain bg-gray-100 rounded-md border mb-4"
        />
        
        <div className="flex items-center space-x-2">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="flex-grow w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 focus:outline-none sm:text-sm"
          />
          <button
            onClick={handleCopy}
            disabled={!shareUrl.startsWith('http')}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none disabled:bg-indigo-300"
          >
            {isCopied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md shadow-sm hover:bg-gray-200 focus:outline-none"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ShareModal;
