
export interface UploadedFile {
  name: string;
  type: string;
  size: number;
  base64: string;
  isProcessing?: boolean;
}

export interface PromptTemplate {
  name: string;
  prompt: string;
  keywords?: string[];
}

// --- CANVAS ELEMENT TYPES (for AddTextModal) ---

interface ColorRange {
    start: number; // character index
    end: number;
    color: string;
}

interface FontSizeRange {
    start: number;
    end: number;
    fontSize: number;
}

export interface TextProperties {
    type: 'text';
    id: number;
    text: string;
    x: number; y: number; width: number;
    fontSize: number; fontFamily: string; color: string;
    colorRanges: ColorRange[]; fontSizeRanges: FontSizeRange[];
    isBold: boolean; isItalic: boolean; isUnderline: boolean;
    textAlign: 'left' | 'center' | 'right';
    rotation: number;
    skewX: number; skewY: number;
    lineHeight: number;
    shadowEnabled: boolean; shadowColor: string; shadowBlur: number; shadowOffsetX: number; shadowOffsetY: number;
    strokeEnabled: boolean; strokeColor: string; strokeWidth: number;
}

export interface ImageProperties {
    type: 'image';
    id: number;
    src: string; // The base64 data URL
    imageElement?: HTMLImageElement; // The loaded image object, transient and optional
    x: number; y: number; width: number; height: number;
    rotation: number; aspectRatio: number;
    skewX: number; skewY: number;
    // FIX: Add shadow and stroke properties to ImageProperties. This resolves a TypeScript error where these properties were used on an ImageProperties object.
    shadowEnabled: boolean; shadowColor: string; shadowBlur: number; shadowOffsetX: number; shadowOffsetY: number;
    strokeEnabled: boolean; strokeColor: string; strokeWidth: number;
}

export interface BannerProperties {
    type: 'banner';
    id: number;
    shape: 'rectangle' | 'ellipse' | 'diamond';
    x: number; y: number; width: number; height: number;
    rotation: number;
    skewX: number; skewY: number;
    backgroundColor: string;
    shadowEnabled: boolean; shadowColor: string; shadowBlur: number; shadowOffsetX: number; shadowOffsetY: number;
    strokeEnabled: boolean; strokeColor: string; strokeWidth: number;
}


export type CanvasElement = TextProperties | ImageProperties | BannerProperties;