import Tesseract from 'tesseract.js';

export async function runOcr(imageBase64: string): Promise<string> {
  try {
    const worker = await Tesseract.createWorker('eng');
    
    // We can use base64 image strings directly with Tesseract
    const { data: { text } } = await worker.recognize(imageBase64);
    
    await worker.terminate();
    
    return text;
  } catch (error) {
    console.error("OCR Error:", error);
    return "OCR processing failed or timed out.";
  }
}
