
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
