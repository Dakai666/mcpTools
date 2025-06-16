export interface CategorizationResult {
    categories: Record<string, string[]>;
    uncategorized: string[];
    statistics: {
        totalFiles: number;
        categorizedFiles: number;
        categorizationRate: number;
    };
    suggestions: string[];
}
export interface CategoryRule {
    name: string;
    extensions: string[];
    keywords: string[];
    pathPatterns: RegExp[];
    contentPatterns: RegExp[];
    priority: number;
}
export declare class FileCategorizer {
    private fileAnalyzer;
    private defaultCategories;
    constructor();
    private initializeDefaultCategories;
    categorizeFiles(dirPath: string, customCategories?: string[]): Promise<CategorizationResult>;
    private categorizeFile;
    private analyzeFileContent;
    private isTextFile;
    private getAllFiles;
    private generateCategorizationSuggestions;
    addCustomCategory(rule: CategoryRule): void;
    getCategoryStatistics(categorizationResult: CategorizationResult): Record<string, any>;
    private getUniqueExtensions;
}
