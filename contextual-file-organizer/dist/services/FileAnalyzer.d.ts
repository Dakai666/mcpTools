export interface FileAnalysisResult {
    totalFiles: number;
    totalSize: number;
    fileTypes: Record<string, number>;
    largestFiles: Array<{
        path: string;
        size: number;
    }>;
    oldestFiles: Array<{
        path: string;
        mtime: Date;
    }>;
    newestFiles: Array<{
        path: string;
        mtime: Date;
    }>;
    contentSummary: Record<string, any>;
}
export interface AnalysisOptions {
    recursive?: boolean;
    includeHidden?: boolean;
    maxContentSample?: number;
}
export declare class FileAnalyzer {
    private readonly supportedTextExtensions;
    private readonly supportedImageExtensions;
    private readonly supportedDocumentExtensions;
    analyzeDirectory(dirPath: string, options?: AnalysisOptions): Promise<FileAnalysisResult>;
    private scanDirectory;
    private analyzeFileContents;
    private extractTextContent;
    private extractKeywords;
    private isCommonWord;
    private getLanguageFromExtension;
    generateFileHash(filePath: string, algorithm?: 'md5' | 'sha256'): Promise<string>;
}
