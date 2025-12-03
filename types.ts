
export interface ProductData {
  id: number;
  name: string;
  dosage: string;
  usage: string;
  isETC: boolean;
  listPrice: string;
  idecoPrice: string;
  manufacturer: string;
  description: string;
  imageBase64?: string;
  mimeType?: string;
  aspectRatio: 'vertical' | 'horizontal'; // New field for layout selection
}

export interface GeneratedResult {
  id: number;
  prompt: string;
  status: 'pending' | 'loading' | 'success' | 'error';
}

export enum AppState {
  IDLE,
  PROCESSING,
  COMPLETE
}

export interface PromptTemplate {
  name: string;
  prompt: string;
  keywords: string[];
}

export interface UploadedFile {
  name: string;
  type: string;
  size: number;
  base64: string;
  isProcessing?: boolean;
}

export interface BaseElement {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  skewX: number;
  skewY: number;
}

export interface TextProperties extends BaseElement {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  strokeEnabled: boolean;
  strokeColor: string;
  strokeWidth: number;
  colorRanges: { start: number; end: number; color: string }[];
  fontSizeRanges: { start: number; end: number; fontSize: number }[];
}

export interface ImageProperties extends BaseElement {
  type: 'image';
  src: string;
  imageElement?: HTMLImageElement;
  aspectRatio: number;
  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  strokeEnabled: boolean;
  strokeColor: string;
  strokeWidth: number;
}

export interface BannerProperties extends BaseElement {
  type: 'banner';
  shape: 'rectangle' | 'ellipse' | 'diamond';
  backgroundColor: string;
  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  strokeEnabled: boolean;
  strokeColor: string;
  strokeWidth: number;
}

export type CanvasElement = TextProperties | ImageProperties | BannerProperties;
