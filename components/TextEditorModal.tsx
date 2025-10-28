import React, { useState, useEffect } from 'react';
import type { UploadedFile } from '../types';
import Modal from './Modal';
import { PlusIcon, TrashIcon } from './Icons';

interface TextEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: UploadedFile | null;
  initialTextLines: string[];
  isExtracting: boolean;
  isApplying: boolean;
  onApply: (newTextLines: string[]) => void;
  onReExtract: () => void;
}

const TextEditorModal: React.FC<TextEditorModalProps> = ({
  isOpen,
  onClose,
  file,
  initialTextLines,
  isExtracting,
  isApplying,
  onApply,
  onReExtract
}) => {
  const [editedTexts, setEditedTexts] = useState<string[]>([]);

  useEffect(() => {
    // Only update from props if the modal is freshly opened or extraction happens
    setEditedTexts(initialTextLines);
  }, [initialTextLines]);

  if (!isOpen || !file) return null;

  const handleTextChange = (index: number, newText: string) => {
    const newEditedTexts = [...editedTexts];
    newEditedTexts[index] = newText;
    setEditedTexts(newEditedTexts);
  };
  
  const handleAddNewLine = () => {
    setEditedTexts([...editedTexts, '']);
  };

  const handleRemoveLine = (index: number) => {
    const newEditedTexts = editedTexts.filter((_, i) => i !== index);
    setEditedTexts(newEditedTexts);
  };

  const handleApplyClick = () => {
    onApply(editedTexts);
  };
  
  const hasChanges = JSON.stringify(initialTextLines) !== JSON.stringify(editedTexts);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
        <div className="relative max-h-[90vh] flex flex-col">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Chỉnh Sửa Văn Bản Trên Ảnh</h3>

            {isApplying && (
                <div className="absolute inset-0 bg-white/80 z-20 flex flex-col justify-center items-center rounded-lg">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                    <p className="mt-3 font-semibold text-gray-700">Đang áp dụng thay đổi...</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-2 flex-grow">
                {/* Image Preview */}
                <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-600">Ảnh Gốc</span>
                    <img
                        src={`data:${file.type};base64,${file.base64}`}
                        alt={file.name}
                        className="w-full object-contain bg-gray-100 rounded-md border"
                    />
                </div>

                {/* Text Editor */}
                <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">Văn bản được trích xuất</span>
                         <button
                            type="button"
                            onClick={handleAddNewLine}
                            disabled={isExtracting || isApplying}
                            className="flex items-center gap-1 text-sm bg-green-100 text-green-700 font-semibold px-2 py-1 rounded-md hover:bg-green-200 transition-colors disabled:opacity-50"
                         >
                             <PlusIcon className="w-4 h-4" />
                             Thêm Dòng
                         </button>
                    </div>
                    {isExtracting ? (
                         <div className="w-full h-full min-h-[150px] bg-gray-100/80 z-10 flex flex-col justify-center items-center rounded-md">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                            <p className="mt-2 text-sm text-gray-600">Đang trích xuất...</p>
                        </div>
                    ) : (
                        editedTexts.length > 0 ? (
                             <div className="flex flex-col gap-2">
                                {editedTexts.map((text, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={text}
                                            onChange={(e) => handleTextChange(index, e.target.value)}
                                            className="flex-grow w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-50"
                                            disabled={isApplying}
                                        />
                                        <button
                                            onClick={() => handleRemoveLine(index)}
                                            disabled={isApplying}
                                            className="p-2 text-gray-500 hover:bg-red-100 hover:text-red-600 rounded-md disabled:opacity-50"
                                            aria-label="Xóa dòng"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-sm text-gray-500 p-4 border-2 border-dashed rounded-md">
                                Không tìm thấy văn bản hoặc bạn đã xóa hết.
                                <br/>
                                Nhấn "Thêm Dòng" để bắt đầu.
                            </div>
                        )
                    )}
                </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t">
                <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md shadow-sm hover:bg-gray-200 focus:outline-none disabled:opacity-50"
                    onClick={onClose}
                    disabled={isApplying}
                >
                    Hủy
                </button>
                <button
                    type="button"
                    onClick={onReExtract}
                    disabled={isExtracting || isApplying}
                    className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 border border-transparent rounded-md shadow-sm hover:bg-indigo-200 focus:outline-none disabled:opacity-50"
                >
                    Trích xuất lại
                </button>
                <button
                    type="button"
                    onClick={handleApplyClick}
                    disabled={isExtracting || isApplying || !hasChanges}
                    className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none disabled:bg-indigo-300 disabled:cursor-not-allowed"
                >
                    Áp dụng thay đổi
                </button>
            </div>
        </div>
    </Modal>
  );
};

export default TextEditorModal;