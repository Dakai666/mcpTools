import { OCRResult, ImageProcessOptions, AnalysisOptions } from '../types/index.js';
export interface OCRBackend {
    name: string;
    isAvailable(): Promise<boolean>;
    recognize(imageBuffer: Buffer, options?: AnalysisOptions): Promise<OCRResult>;
}
export declare class EnhancedOCREngine {
    private backends;
    private currentBackend;
    constructor();
    initialize(): Promise<void>;
    processImage(imagePath: string, options?: ImageProcessOptions): Promise<Buffer>;
    recognizeText(imageBuffer: Buffer, options?: AnalysisOptions): Promise<OCRResult>;
    private postProcessResult;
    getAvailableBackends(): string[];
    getCurrentBackend(): string | null;
    terminate(): Promise<void>;
}
//# sourceMappingURL=EnhancedOCREngine.d.ts.map