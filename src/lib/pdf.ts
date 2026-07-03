import * as pdfjsLib from 'pdfjs-dist';
// The worker is needed for pdf.js to run in the browser without blocking the main thread
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export async function extractPdfPages(fileUrl: string, maxPages = 5): Promise<string[]> {
  const loadingTask = pdfjsLib.getDocument({ url: fileUrl });
  const pdf = await loadingTask.promise;
  const numPages = Math.min(pdf.numPages, maxPages); // Limit pages for MVP performance
  const pages: string[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    
    // Use a reasonable scale to balance OCR quality vs memory/processing time
    const viewport = page.getViewport({ scale: 1.5 });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) throw new Error('Could not create canvas context');
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport
    } as any).promise;

    // Convert canvas to base64 jpeg
    const imgData = canvas.toDataURL('image/jpeg', 0.8);
    pages.push(imgData);
  }

  return pages;
}
