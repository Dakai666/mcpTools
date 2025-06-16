import fs from 'fs-extra';
import path from 'path';
import { FileCategorizer } from './FileCategorizer.js';
export class DirectoryOrganizer {
    fileCategorizer;
    constructor() {
        this.fileCategorizer = new FileCategorizer();
    }
    async organizeDirectory(sourcePath, targetPath, options = {}) {
        const { dryRun = false, createBackup = true, preserveStructure = false, conflictResolution = 'rename' } = options;
        const result = {
            filesProcessed: 0,
            directoriesCreated: 0,
            filesMoved: 0,
            errors: [],
            operations: []
        };
        try {
            // Validate paths
            if (!await fs.pathExists(sourcePath)) {
                throw new Error(`Source path does not exist: ${sourcePath}`);
            }
            // Create backup if requested
            if (createBackup && !dryRun) {
                await this.createBackup(sourcePath, result);
            }
            // Analyze and categorize files
            const categorization = await this.fileCategorizer.categorizeFiles(sourcePath);
            // Create target directory structure
            if (!dryRun) {
                await fs.ensureDir(targetPath);
            }
            // Process each category
            for (const [category, files] of Object.entries(categorization.categories)) {
                const categoryPath = path.join(targetPath, this.sanitizeCategoryName(category));
                // Create category directory
                if (!dryRun) {
                    await fs.ensureDir(categoryPath);
                }
                result.operations.push({
                    action: 'create_dir',
                    source: '',
                    target: categoryPath,
                    success: true
                });
                result.directoriesCreated++;
                // Move files to category directory
                for (const filePath of files) {
                    const fileName = path.basename(filePath);
                    let targetFilePath = path.join(categoryPath, fileName);
                    // Handle conflicts
                    if (!dryRun && await fs.pathExists(targetFilePath)) {
                        targetFilePath = await this.resolveFileConflict(targetFilePath, conflictResolution);
                    }
                    const operation = {
                        action: 'move',
                        source: filePath,
                        target: targetFilePath,
                        success: true
                    };
                    try {
                        if (!dryRun) {
                            if (preserveStructure) {
                                // Preserve relative directory structure within category
                                const relativePath = path.relative(sourcePath, filePath);
                                const targetWithStructure = path.join(categoryPath, relativePath);
                                await fs.ensureDir(path.dirname(targetWithStructure));
                                await fs.move(filePath, targetWithStructure);
                                operation.target = targetWithStructure;
                            }
                            else {
                                await fs.move(filePath, targetFilePath);
                            }
                        }
                        result.filesMoved++;
                    }
                    catch (error) {
                        operation.success = false;
                        operation.error = error instanceof Error ? error.message : String(error);
                        result.errors.push(`Failed to move ${filePath}: ${operation.error}`);
                    }
                    result.operations.push(operation);
                    result.filesProcessed++;
                }
            }
            // Handle uncategorized files
            if (categorization.uncategorized.length > 0) {
                const uncategorizedPath = path.join(targetPath, 'Uncategorized');
                if (!dryRun) {
                    await fs.ensureDir(uncategorizedPath);
                }
                result.operations.push({
                    action: 'create_dir',
                    source: '',
                    target: uncategorizedPath,
                    success: true
                });
                result.directoriesCreated++;
                for (const filePath of categorization.uncategorized) {
                    const fileName = path.basename(filePath);
                    let targetFilePath = path.join(uncategorizedPath, fileName);
                    if (!dryRun && await fs.pathExists(targetFilePath)) {
                        targetFilePath = await this.resolveFileConflict(targetFilePath, conflictResolution);
                    }
                    const operation = {
                        action: 'move',
                        source: filePath,
                        target: targetFilePath,
                        success: true
                    };
                    try {
                        if (!dryRun) {
                            await fs.move(filePath, targetFilePath);
                        }
                        result.filesMoved++;
                    }
                    catch (error) {
                        operation.success = false;
                        operation.error = error instanceof Error ? error.message : String(error);
                        result.errors.push(`Failed to move ${filePath}: ${operation.error}`);
                    }
                    result.operations.push(operation);
                    result.filesProcessed++;
                }
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            result.errors.push(`Organization failed: ${errorMessage}`);
        }
        return result;
    }
    async createBackup(sourcePath, result) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = `${sourcePath}_backup_${timestamp}`;
        try {
            await fs.copy(sourcePath, backupPath);
            result.operations.push({
                action: 'copy',
                source: sourcePath,
                target: backupPath,
                success: true
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            result.errors.push(`Backup creation failed: ${errorMessage}`);
            throw error; // Re-throw to stop the organization process
        }
    }
    sanitizeCategoryName(categoryName) {
        return categoryName
            .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid characters
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .replace(/_+/g, '_') // Remove multiple consecutive underscores
            .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
    }
    async resolveFileConflict(targetPath, resolution) {
        switch (resolution) {
            case 'skip':
                throw new Error('File exists and skip resolution selected');
            case 'overwrite':
                return targetPath;
            case 'rename':
            default:
                return await this.generateUniqueFileName(targetPath);
        }
    }
    async generateUniqueFileName(originalPath) {
        const dir = path.dirname(originalPath);
        const ext = path.extname(originalPath);
        const name = path.basename(originalPath, ext);
        let counter = 1;
        let newPath = originalPath;
        while (await fs.pathExists(newPath)) {
            newPath = path.join(dir, `${name}_${counter}${ext}`);
            counter++;
        }
        return newPath;
    }
    async createCustomStructure(basePath, structure) {
        const result = {
            filesProcessed: 0,
            directoriesCreated: 0,
            filesMoved: 0,
            errors: [],
            operations: []
        };
        try {
            await fs.ensureDir(basePath);
            for (const [categoryName, subCategories] of Object.entries(structure)) {
                const categoryPath = path.join(basePath, this.sanitizeCategoryName(categoryName));
                // Create main category directory
                await fs.ensureDir(categoryPath);
                result.operations.push({
                    action: 'create_dir',
                    source: '',
                    target: categoryPath,
                    success: true
                });
                result.directoriesCreated++;
                // Create subcategory directories
                for (const subCategory of subCategories) {
                    const subCategoryPath = path.join(categoryPath, this.sanitizeCategoryName(subCategory));
                    await fs.ensureDir(subCategoryPath);
                    result.operations.push({
                        action: 'create_dir',
                        source: '',
                        target: subCategoryPath,
                        success: true
                    });
                    result.directoriesCreated++;
                }
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            result.errors.push(`Structure creation failed: ${errorMessage}`);
        }
        return result;
    }
    async generateRecommendedStructure(analysisPath) {
        const categorization = await this.fileCategorizer.categorizeFiles(analysisPath);
        const structure = {};
        // Generate structure based on categorization results
        Object.keys(categorization.categories).forEach(category => {
            switch (category) {
                case 'Reports':
                    structure[category] = ['Annual', 'Quarterly', 'Monthly', 'Ad-hoc'];
                    break;
                case 'Notes':
                    structure[category] = ['Meeting_Notes', 'Personal', 'Project_Notes', 'Ideas'];
                    break;
                case 'Financial':
                    structure[category] = ['Invoices', 'Receipts', 'Budgets', 'Statements'];
                    break;
                case 'Images':
                    structure[category] = ['Screenshots', 'Photos', 'Icons', 'Graphics'];
                    break;
                case 'Source_Code':
                    structure[category] = ['Active_Projects', 'Archives', 'Libraries', 'Scripts'];
                    break;
                default:
                    structure[category] = ['Current', 'Archive'];
            }
        });
        // Add common utility directories
        structure['_Inbox'] = ['To_Process', 'Temporary'];
        structure['_Archive'] = ['Old_Files', 'Deprecated'];
        return structure;
    }
    async cleanupEmptyDirectories(rootPath) {
        const removedDirectories = [];
        async function removeEmptyDirs(dirPath) {
            try {
                const entries = await fs.readdir(dirPath);
                let hasFiles = false;
                for (const entry of entries) {
                    const entryPath = path.join(dirPath, entry);
                    const stat = await fs.stat(entryPath);
                    if (stat.isDirectory()) {
                        const dirHasFiles = await removeEmptyDirs(entryPath);
                        if (dirHasFiles)
                            hasFiles = true;
                    }
                    else {
                        hasFiles = true;
                    }
                }
                if (!hasFiles && dirPath !== rootPath) {
                    await fs.rmdir(dirPath);
                    removedDirectories.push(dirPath);
                    return false;
                }
                return hasFiles;
            }
            catch (error) {
                console.error(`Error processing directory ${dirPath}:`, error);
                return true; // Assume directory has content if we can't read it
            }
        }
        await removeEmptyDirs(rootPath);
        return removedDirectories;
    }
}
