
import React from 'react';

type AspectRatio = "9:16" | "3:4" | "1:1" | "16:9" | "4:3";

interface AspectRatioSelectorProps {
  selectedAspectRatio: AspectRatio;
  setSelectedAspectRatio: (ratio: AspectRatio) => void;
}

const ASPECT_RATIOS: { label: string; value: AspectRatio }[] = [
  { label: 'Dọc', value: '9:16' },
  { label: 'Dọc (Hẹp)', value: '3:4' },
  { label: 'Vuông', value: '1:1' },
  { label: 'Ngang', value: '16:9' },
  { label: 'Ảnh bìa', value: '4:3' },
];

const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({ selectedAspectRatio, setSelectedAspectRatio }) => {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-700 mb-2">3. Chọn Khổ Ảnh</h2>
      <p className="text-sm text-gray-500 mb-4">Chọn tỷ lệ khung hình mong muốn cho poster của bạn.</p>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {ASPECT_RATIOS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setSelectedAspectRatio(value)}
            className={`w-full p-3 rounded-lg border-2 text-center font-medium transition-colors duration-200
              ${selectedAspectRatio === value
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                : 'bg-white border-gray-300 text-gray-700 hover:border-indigo-500 hover:bg-indigo-50'
              }`}
          >
            <div className="font-bold text-sm">{label}</div>
            <div className="text-xs">({value})</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AspectRatioSelector;
