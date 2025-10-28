import React from 'react';
import Modal from './Modal';
import Spinner from './Spinner';

interface VideoGenerationModalProps {
    isOpen: boolean;
    onClose: () => void;
    isLoading: boolean;
    status: string;
    videoUrl: string | null;
    error: string | null;
}

const VideoGenerationModal: React.FC<VideoGenerationModalProps> = ({ isOpen, onClose, isLoading, status, videoUrl, error }) => {
    if (!isOpen) return null;

    // Helper to render error message with a link
    const renderError = (errorMessage: string) => {
        const url = 'ai.google.dev/gemini-api/docs/billing';
        const parts = errorMessage.split(url);
        if (parts.length === 2) {
            return (
                <p className="text-sm">
                    {parts[0]}
                    <a href={`https://${url}`} target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-red-800">
                        {url}
                    </a>
                    {parts[1]}
                </p>
            );
        }
        return <p className="text-sm">{errorMessage}</p>;
    };


    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="p-4">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Video Generation</h3>

                {isLoading && (
                    <div className="text-center text-gray-600 my-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="mt-4 font-semibold">{status}</p>
                        <p className="text-sm text-gray-500">This may take several minutes. Please be patient.</p>
                    </div>
                )}

                {error && !isLoading && (
                    <div className="text-center text-red-600 bg-red-50 p-4 rounded-lg my-4">
                        <h3 className="font-bold">Generation Failed</h3>
                        {renderError(error)}
                    </div>
                )}
                
                {videoUrl && !isLoading && (
                     <div className="my-4">
                        <video
                            src={videoUrl}
                            controls
                            className="w-full rounded-lg bg-black"
                            autoPlay
                        >
                            Your browser does not support the video tag.
                        </video>
                         <a 
                            href={videoUrl} 
                            download="generated-video.mp4"
                            className="w-full mt-4 inline-flex items-center justify-center bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                        >
                            Download Video
                        </a>
                     </div>
                )}

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

export default VideoGenerationModal;