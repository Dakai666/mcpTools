import { OCRResult, ContentAnalysis } from '../types/index.js';
export declare class ContentAnalyzer {
    analyzeContent(ocrResult: OCRResult): ContentAnalysis;
    private extractTextBlocks;
    private classifyTextType;
    private detectTables;
    private detectColumnPositions;
    private extractTableData;
    private calculateTableBounds;
    private calculateBounds;
    private detectLanguages;
    private generateSummary;
}
//# sourceMappingURL=ContentAnalyzer.d.ts.map