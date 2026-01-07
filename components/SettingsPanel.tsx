import React from 'react';
import { ASPECT_RATIOS, STYLES } from '../constants';
import { GenerationSettings } from '../types';
import { Square, RectangleHorizontal, RectangleVertical, Monitor, Smartphone, Palette, Ratio } from 'lucide-react';

interface SettingsPanelProps {
  settings: GenerationSettings;
  onChange: (newSettings: GenerationSettings) => void;
  disabled?: boolean;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onChange, disabled }) => {
  
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Square': return <Square size={18} />;
      case 'RectangleHorizontal': return <RectangleHorizontal size={18} />;
      case 'RectangleVertical': return <RectangleVertical size={18} />;
      case 'Monitor': return <Monitor size={18} />;
      case 'Smartphone': return <Smartphone size={18} />;
      default: return <Square size={18} />;
    }
  };

  return (
    <div className="bg-surface/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 space-y-6">
      
      {/* Aspect Ratio Section */}
      <div>
        <div className="flex items-center gap-2 mb-3 text-slate-300 text-sm font-semibold uppercase tracking-wider">
          <Ratio size={16} />
          <span>Tỉ lệ khung hình</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {ASPECT_RATIOS.map((ratio) => (
            <button
              key={ratio.value}
              disabled={disabled}
              onClick={() => onChange({ ...settings, aspectRatio: ratio.value })}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                settings.aspectRatio === ratio.value
                  ? 'bg-primary/20 border-primary text-white shadow-sm'
                  : 'bg-darker/50 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
              }`}
            >
              <div className="mb-2 opacity-80">{getIcon(ratio.icon)}</div>
              <span className="text-xs font-medium">{ratio.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Style Section */}
      <div>
        <div className="flex items-center gap-2 mb-3 text-slate-300 text-sm font-semibold uppercase tracking-wider">
          <Palette size={16} />
          <span>Phong cách nghệ thuật</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {STYLES.map((style) => (
            <button
              key={style.value}
              disabled={disabled}
              onClick={() => onChange({ ...settings, style: style.value })}
              className={`px-3 py-2 rounded-lg text-sm border transition-all text-left truncate ${
                settings.style === style.value
                  ? 'bg-secondary/20 border-secondary text-white'
                  : 'bg-darker/50 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
              }`}
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;