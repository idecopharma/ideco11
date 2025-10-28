import React, { useCallback, useState } from 'react';
import type { UploadedFile } from '../types';
import { fileToBase64 } from '../utils/fileUtils';
import { UploadIcon, TrashIcon, SparklesIcon, PencilIcon } from './Icons';
import ImageSearcher from './ImageSearcher';

interface ImageUploaderProps {
  uploadedFiles: UploadedFile[];
  setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  onRemoveBackground: (index: number) => void;
  onEditText: (index: number) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ uploadedFiles, setUploadedFiles, onRemoveBackground, onEditText }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;

    const filePromises = Array.from(files).map(async (file) => {
      const base64 = await fileToBase64(file);
      return {
        name: file.name,
        type: file.type,
        size: file.size,
        base64: base64,
      };
    });

    const newFiles = await Promise.all(filePromises);
    setUploadedFiles(prev => [...prev, ...newFiles]);
  }, [setUploadedFiles]);

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(files => files.filter((_, i) => i !== index));
  };

  const handleImageSelect = (file: UploadedFile) => {
    setUploadedFiles(prev => [...prev, file]);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-700 mb-2">1. Upload Images (Optional)</h2>
      <p className="text-sm text-gray-500 mb-4">Add product images or other visual elements for the AI to include in the poster.</p>
      <label
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`flex justify-center items-center w-full h-32 px-4 transition bg-white border-2 border-dashed rounded-md appearance-none cursor-pointer hover:border-indigo-400 focus:outline-none ${isDragging ? 'border-indigo-600' : 'border-gray-300'}`}
      >
        <span className="flex items-center space-x-2">
          <UploadIcon className="w-6 h-6 text-gray-600" />
          <span className="font-medium text-gray-600">
            Drop files to attach, or <span className="text-indigo-600 underline">browse</span>
          </span>
        </span>
        <input
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>

      {uploadedFiles.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {uploadedFiles.map((file, index) => (
            <div key={`${file.name}-${index}`} className="flex flex-col gap-2">
                <div className="relative">
                    <img
                        src={`data:${file.type};base64,${file.base64}`}
                        alt={file.name}
                        className="w-full h-24 object-contain bg-gray-100 rounded-md border"
                    />
                    {file.isProcessing && (
                        <div className="absolute top-1 right-1 bg-white/80 backdrop-blur-sm rounded-full p-1">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                        </div>
                    )}
                </div>
                <div className="text-xs text-gray-500 truncate" title={file.name}>{file.name}</div>
                <div className="flex gap-1">
                    <button
                        onClick={() => onRemoveBackground(index)}
                        disabled={file.isProcessing}
                        className="flex-1 text-xs inline-flex items-center justify-center gap-1 px-2 py-1.5 border border-transparent rounded-md shadow-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        title="Xóa Nền"
                    >
                        <SparklesIcon className="w-3.5 h-3.5" />
                    </button>
                     <button
                        onClick={() => onEditText(index)}
                        disabled={file.isProcessing}
                        className="flex-1 text-xs inline-flex items-center justify-center gap-1 px-2 py-1.5 border border-transparent rounded-md shadow-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        title="Sửa Chữ"
                    >
                        <PencilIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => removeFile(index)}
                        disabled={file.isProcessing}
                        className="p-1.5 border border-gray-300 rounded-md text-gray-500 hover:bg-red-100 hover:text-red-600 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        aria-label="Remove image"
                        title="Xóa ảnh"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
          ))}
        </div>
      )}
      <ImageSearcher onImageSelect={handleImageSelect} />
    </div>
  );
};

export default ImageUploader;