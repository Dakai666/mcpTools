import { OCRResult, ImageProcessOptions, AnalysisOptions } from '../types/index.js';
export declare class OptimizedOCREngine {
    private worker;
    private isInitialized;
    initialize(languages?: string[]): Promise<void>;
    processImage(imagePath: string, options?: ImageProcessOptions): Promise<Buffer>;
    recognizeText(imageBuffer: Buffer, options?: AnalysisOptions): Promise<OCRResult>;
    private cleanText;
    private extractWords;
    private extractParagraphs;
    private extractBlocks;
    terminate(): Promise<void>;
}
//# sourceMappingURL=OptimizedOCREngine.d.ts.map