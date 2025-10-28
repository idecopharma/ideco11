
import React, { useState } from 'react';
import type { PromptTemplate } from '../types';
import Modal from './Modal';
import { PlusIcon, SaveIcon, XMarkIcon, LanguageIcon, SparklesIcon } from './Icons';
import { GENERIC_KEYWORDS } from '../constants';

// A small, self-contained spinner for the new buttons
const SmallSpinner: React.FC = () => (
  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
);

interface PromptManagerProps {
  prompt: string;
  setPrompt: React.Dispatch<React.SetStateAction<string>>;
  templates: PromptTemplate[];
  setTemplates: React.Dispatch<React.SetStateAction<PromptTemplate[]>>;
  onTranslate: () => Promise<void>;
  onEnhance: () => Promise<void>;
  isTranslating: boolean;
  isEnhancing: boolean;
}

const PromptManager: React.FC<PromptManagerProps> = ({
  prompt,
  setPrompt,
  templates,
  setTemplates,
  onTranslate,
  onEnhance,
  isTranslating,
  isEnhancing,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplatePrompt, setNewTemplatePrompt] = useState('');
  const [newTemplateKeywords, setNewTemplateKeywords] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);

  const handleSaveTemplate = () => {
    if (newTemplateName.trim() && newTemplatePrompt.trim()) {
      const keywords = newTemplateKeywords.split(',').map(k => k.trim()).filter(k => k);
      setTemplates([...templates, { name: newTemplateName, prompt: newTemplatePrompt, keywords }]);
      setNewTemplateName('');
      setNewTemplatePrompt('');
      setNewTemplateKeywords('');
      setIsModalOpen(false);
    }
  };
  
  const handleDeleteTemplate = (indexToDelete: number) => {
    setTemplates(templates.filter((_, index) => index !== indexToDelete));
  };

  const handleSelectTemplate = (template: PromptTemplate) => {
    setPrompt(template.prompt);
    setSelectedTemplate(template);
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    if (selectedTemplate) {
      setSelectedTemplate(null);
    }
  };
  
  const handleAddKeyword = (keyword: string) => {
    setPrompt(prev => prev.trim() ? `${prev.trim()}, ${keyword}` : keyword);
    if (selectedTemplate) {
        setSelectedTemplate(null);
    }
  };

  const keywordsToShow = selectedTemplate?.keywords && selectedTemplate.keywords.length > 0
    ? selectedTemplate.keywords
    : GENERIC_KEYWORDS;

  return (
    <div>
       <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold text-gray-700">2. Describe Your Poster</h2>
            <div className="flex items-center gap-2">
                <button
                    onClick={onTranslate}
                    disabled={!prompt.trim() || isTranslating || isEnhancing}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-sky-300 disabled:cursor-not-allowed transition-colors"
                    title="Translate prompt to English for better results"
                >
                    {isTranslating ? <SmallSpinner /> : <LanguageIcon className="w-4 h-4" />}
                    <span>{isTranslating ? 'Translating...' : 'Dịch'}</span>
                </button>
                <button
                    onClick={onEnhance}
                    disabled={!prompt.trim() || isTranslating || isEnhancing}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-purple-300 disabled:cursor-not-allowed transition-colors"
                    title="Enhance prompt with more details for better image quality"
                >
                    {isEnhancing ? <SmallSpinner /> : <SparklesIcon className="w-4 h-4" />}
                    <span>{isEnhancing ? 'Enhancing...' : 'Nâng cao'}</span>
                </button>
            </div>
        </div>
      <p className="text-sm text-gray-500 mb-4">
        Write a detailed prompt. You can also use a template below to get started.
      </p>
      <textarea
        value={prompt}
        onChange={handlePromptChange}
        placeholder="e.g., A vibrant poster for a new energy drink, with a splash of fruit..."
        className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
      />

      <div className="mt-4">
        <h3 className="text-md font-semibold text-gray-600 mb-2">Keyword Suggestions</h3>
        <div className="flex flex-wrap gap-2">
          {keywordsToShow.map((keyword, index) => (
            <button
              key={index}
              onClick={() => handleAddKeyword(keyword)}
              className="bg-sky-100 text-sky-800 text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-sky-200 transition-colors flex items-center gap-1"
            >
              <PlusIcon className="w-3 h-3" />
              {keyword}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-md font-semibold text-gray-600">Prompt Templates</h3>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1 text-sm bg-indigo-100 text-indigo-700 font-semibold px-3 py-1 rounded-md hover:bg-indigo-200 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            New
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {templates.map((template, index) => (
             <div key={`${template.name}-${index}`} className="group flex items-center bg-gray-200 text-gray-800 rounded-full text-sm transition-shadow duration-200 hover:shadow-md">
                <button
                    onClick={() => handleSelectTemplate(template)}
                    className="pl-3 pr-2 py-1 hover:bg-gray-300 rounded-l-full transition-colors"
                >
                    {template.name}
                </button>
                <button
                    onClick={() => handleDeleteTemplate(index)}
                    className="px-2 py-1 text-gray-500 hover:bg-red-200 hover:text-red-600 rounded-r-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    aria-label={`Delete ${template.name} template`}
                >
                    <XMarkIcon className="w-4 h-4" />
                </button>
            </div>
          ))}
        </div>
      </div>
      
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h3 className="text-lg font-bold text-gray-900">Create New Prompt Template</h3>
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="template-name" className="block text-sm font-medium text-gray-700">Template Name</label>
            <input
              id="template-name"
              type="text"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="e.g., Summer Sale Poster"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="template-prompt" className="block text-sm font-medium text-gray-700">Prompt Text</label>
            <textarea
              id="template-prompt"
              rows={5}
              value={newTemplatePrompt}
              onChange={(e) => setNewTemplatePrompt(e.target.value)}
              placeholder="Enter the prompt text here..."
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="template-keywords" className="block text-sm font-medium text-gray-700">Keywords</label>
             <input
              id="template-keywords"
              type="text"
              value={newTemplateKeywords}
              onChange={(e) => setNewTemplateKeywords(e.target.value)}
              placeholder="e.g., vibrant, colorful, summer"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">Enter keywords separated by commas.</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md shadow-sm hover:bg-gray-200 focus:outline-none"
            onClick={() => setIsModalOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveTemplate}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none"
          >
            <SaveIcon className="w-4 h-4 mr-2" />
            Save Template
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default PromptManager;
