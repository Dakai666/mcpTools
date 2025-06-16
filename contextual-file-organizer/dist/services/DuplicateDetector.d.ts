export interface DuplicateGroup {
    hash: string;
    size: number;
    files: string[];
}
export interface DuplicateDetectionResult {
    groups: DuplicateGroup[];
    totalDuplicateFiles: number;
    wastedSpace: number;
    statistics: {
        totalFilesScanned: number;
        uniqueFiles: number;
        duplicateGroups: number;
        largestDuplicateGroup: number;
    };
}
export interface DetectionOptions {
    recursive?: boolean;
    algorithm?: 'md5' | 'sha256';
    minFileSize?: number;
    maxFileSize?: number;
    includeExtensions?: string[];
    excludeExtensions?: string[];
}
export declare class DuplicateDetector {
    findDuplicates(dirPath: string, options?: DetectionOptions): Promise<DuplicateDetectionResult>;
    private collectFiles;
    private calculateFileHash;
    findDuplicatesByContent(filePaths: string[], algorithm?: 'md5' | 'sha256'): Promise<DuplicateGroup[]>;
    generateDuplicateReport(result: DuplicateDetectionResult, format?: 'text' | 'json' | 'csv'): Promise<string>;
    private generateTextReport;
    private generateCSVReport;
    private formatBytes;
    suggestDuplicateResolution(result: DuplicateDetectionResult): Promise<Array<{
        group: DuplicateGroup;
        recommendation: string;
        reasoning: string;
    }>>;
    private analyzeFilePaths;
}
