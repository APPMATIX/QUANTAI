import { supabase } from './supabase';

export interface AnalyzePayload {
  projectId: string;
  drawingId: string;
  pages: {
    imageUrl: string; // The signed URL of the image
    ocrText: string;  // The Tesseract output
  }[];
}

export interface BoqConstant {
  name: string;
  value: number;
  unit: string;
  description: string;
}

export interface BoqItem {
  category: 'Substructure' | 'Superstructure' | 'Finishes' | 'MEP';
  description: string;
  nos: number;
  length_m: number;
  width_m: number;
  height_m: number;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  remarks: string;
}

export interface QuantityResults {
  constants?: BoqConstant[];
  items?: BoqItem[];
}

export async function analyzeDrawing(payload: AnalyzePayload): Promise<QuantityResults> {
  // Call the Supabase Edge Function 'analyze-drawing'
  // Note: For large base64 payloads, this could exceed typical function limits (often 6MB for Edge Functions).
  // In a robust implementation, the Edge Function would download the file from Storage directly instead of receiving base64.
  // Given MVP scope, we'll proceed with sending it if it fits, or you can refactor the Edge Function to read from Storage.
  
  const { data, error } = await supabase.functions.invoke('analyze-drawing', {
    body: payload
  });

  if (error) {
    console.error('Edge Function Error:', error);
    throw new Error(error.message || 'Failed to analyze drawing');
  }

  if (data?.error) {
    throw new Error(`AI Analysis Error: ${data.error}`);
  }

  return data as QuantityResults;
}
