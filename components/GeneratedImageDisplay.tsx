
import React from 'react';
import { ImageIcon, PencilIcon, ShareIcon, VideoCameraIcon, PaintBrushIcon } from './Icons';

interface GeneratedImageDisplayProps {
  isLoading: boolean;
  generatedImage: string | null;
  error: string | null;
  onEditImage: () => void;
  onEditText: () => void;
  onShare: () => void;
  onGenerateVideo: () => void;
  onDoubleClick: () => void;
  onOpenCanvasEditor: () => void;
}

const GeneratedImageDisplay: React.FC<GeneratedImageDisplayProps> = ({
  isLoading,
  generatedImage,
  error,
  onEditImage,
  onEditText,
  onShare,
  onGenerateVideo,
  onDoubleClick,
  onOpenCanvasEditor,
}) => {
  if (isLoading) {
    return (
      <div className="text-center text-gray-600">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 font-semibold">Generating your masterpiece...</p>
        <p className="text-sm text-gray-500">This may take a moment.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 bg-red-50 p-4 rounded-lg">
        <h3 className="font-bold">Generation Failed</h3>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (generatedImage) {
    return (
        <div className="w-full text-center">
            <img 
                src={generatedImage} 
                alt="Generated poster" 
                className="max-w-full max-h-[70vh] object-contain rounded-lg mx-auto shadow-lg cursor-pointer"
                onDoubleClick={onDoubleClick}
                title="Double-click to add to Quote Tool"
            />
            <div className="flex justify-center items-center flex-wrap gap-2 sm:gap-4 mt-4">
                <a 
                    href={generatedImage} 
                    download="generated-poster.png"
                    className="inline-flex items-center justify-center bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                >
                    Download
                </a>
                <button
                    onClick={onEditImage}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                    title="Edit Image (Inpaint)"
                >
                    <PencilIcon className="w-5 h-5" />
                    Sửa Ảnh
                </button>
                 <button
                    onClick={onEditText}
                    className="inline-flex items-center gap-2 bg-orange-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors"
                    title="Sửa Chữ"
                >
                    <PencilIcon className="w-5 h-5" />
                    Sửa Chữ
                </button>
                 <button
                    onClick={onOpenCanvasEditor}
                    className="inline-flex items-center gap-2 bg-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
                    title="Mở trình thiết kế chuyên nghiệp"
                >
                    <PaintBrushIcon className="w-5 h-5" />
                    Thiết Kế
                </button>
                 <button
                    onClick={onGenerateVideo}
                    className="inline-flex items-center gap-2 bg-teal-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-600 transition-colors"
                    title="Create Video"
                >
                    <VideoCameraIcon className="w-5 h-5" />
                    Tạo Video
                </button>
                 <button
                    onClick={onShare}
                    className="inline-flex items-center gap-2 bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                    title="Share Image"
                >
                    <ShareIcon className="w-5 h-5" />
                    Share
                </button>
            </div>
        </div>
    );
  }

  return (
    <div className="text-center text-gray-500">
      <ImageIcon className="w-16 h-16 mx-auto text-gray-300" />
      <h3 className="mt-4 text-lg font-semibold">Your generated poster will appear here</h3>
      <p className="mt-1 text-sm">Upload images and write a prompt to get started.</p>
    </div>
  );
};

export default GeneratedImageDisplay;
