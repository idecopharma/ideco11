import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Spinner from './Spinner';

interface VideoPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageSrc: string;
    initialPrompt: string;
    isGenerating: boolean;
    onSubmit: (prompt: string) => void;
}

const VideoPromptModal: React.FC<VideoPromptModalProps> = ({ isOpen, onClose, imageSrc, initialPrompt, isGenerating, onSubmit }) => {
    const [prompt, setPrompt] = useState(initialPrompt);

    useEffect(() => {
        if (isOpen) {
            setPrompt(initialPrompt);
        }
    }, [isOpen, initialPrompt]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (prompt.trim()) {
            onSubmit(prompt);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <form onSubmit={handleSubmit} className="p-2">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Create Video from Image</h3>
                
                <p className="text-sm text-gray-600 mb-4">
                  Describe how you want this image to be animated. You can use the original prompt or write a new one.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <img 
                        src={imageSrc} 
                        alt="Image to be animated" 
                        className="w-full h-40 object-contain bg-gray-100 rounded-md border"
                    />
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., A gentle breeze rustles the leaves, sunlight flickers..."
                        className="md:col-span-2 w-full h-40 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                        disabled={isGenerating}
                    />
                </div>

                <div className="mt-6 flex justify-end gap-3">
                     <button
                        type="button"
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md shadow-sm hover:bg-gray-200 focus:outline-none"
                        onClick={onClose}
                        disabled={isGenerating}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isGenerating || !prompt.trim()}
                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none disabled:bg-indigo-300 disabled:cursor-not-allowed"
                    >
                        {isGenerating && <Spinner />}
                        {isGenerating ? 'Starting...' : 'Generate Video'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default VideoPromptModal;
