export interface OrganizationResult {
    filesProcessed: number;
    directoriesCreated: number;
    filesMoved: number;
    errors: string[];
    operations: OrganizationOperation[];
}
export interface OrganizationOperation {
    action: 'move' | 'copy' | 'create_dir';
    source: string;
    target: string;
    success: boolean;
    error?: string;
}
export interface OrganizationOptions {
    dryRun?: boolean;
    createBackup?: boolean;
    preserveStructure?: boolean;
    conflictResolution?: 'skip' | 'rename' | 'overwrite';
}
export declare class DirectoryOrganizer {
    private fileCategorizer;
    constructor();
    organizeDirectory(sourcePath: string, targetPath: string, options?: OrganizationOptions): Promise<OrganizationResult>;
    private createBackup;
    private sanitizeCategoryName;
    private resolveFileConflict;
    private generateUniqueFileName;
    createCustomStructure(basePath: string, structure: Record<string, string[]>): Promise<OrganizationResult>;
    generateRecommendedStructure(analysisPath: string): Promise<Record<string, string[]>>;
    cleanupEmptyDirectories(rootPath: string): Promise<string[]>;
}
