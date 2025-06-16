import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
export class DuplicateDetector {
    async findDuplicates(dirPath, options = {}) {
        const { recursive = true, algorithm = 'sha256', minFileSize = 0, maxFileSize = Infinity, includeExtensions = [], excludeExtensions = [] } = options;
        const filesBySize = new Map();
        const filesByHash = new Map();
        const allFiles = [];
        // Step 1: Collect all files and group by size
        await this.collectFiles(dirPath, allFiles, recursive);
        // Filter files based on criteria
        const filteredFiles = allFiles.filter(filePath => {
            const stats = fs.statSync(filePath);
            const ext = path.extname(filePath).toLowerCase();
            // Size filter
            if (stats.size < minFileSize || stats.size > maxFileSize) {
                return false;
            }
            // Extension filters
            if (includeExtensions.length > 0 && !includeExtensions.includes(ext)) {
                return false;
            }
            if (excludeExtensions.length > 0 && excludeExtensions.includes(ext)) {
                return false;
            }
            return true;
        });
        // Group files by size (quick pre-filter)
        for (const filePath of filteredFiles) {
            const stats = fs.statSync(filePath);
            const size = stats.size;
            if (!filesBySize.has(size)) {
                filesBySize.set(size, []);
            }
            filesBySize.get(size).push(filePath);
        }
        // Step 2: Hash files that have the same size
        for (const [size, files] of filesBySize.entries()) {
            if (files.length > 1) {
                // Multiple files with same size - need to hash them
                for (const filePath of files) {
                    try {
                        const hash = await this.calculateFileHash(filePath, algorithm);
                        const key = `${size}_${hash}`;
                        if (!filesByHash.has(key)) {
                            filesByHash.set(key, []);
                        }
                        filesByHash.get(key).push(filePath);
                    }
                    catch (error) {
                        console.error(`Error hashing file ${filePath}:`, error);
                    }
                }
            }
        }
        // Step 3: Identify duplicate groups
        const duplicateGroups = [];
        let totalDuplicateFiles = 0;
        let wastedSpace = 0;
        for (const [key, files] of filesByHash.entries()) {
            if (files.length > 1) {
                const [sizeStr, hash] = key.split('_', 2);
                const size = parseInt(sizeStr, 10);
                duplicateGroups.push({
                    hash,
                    size,
                    files: [...files]
                });
                // Count duplicates (excluding one original)
                totalDuplicateFiles += files.length - 1;
                wastedSpace += (files.length - 1) * size;
            }
        }
        // Sort duplicate groups by wasted space (descending)
        duplicateGroups.sort((a, b) => (b.files.length - 1) * b.size - (a.files.length - 1) * a.size);
        const largestDuplicateGroup = duplicateGroups.length > 0
            ? Math.max(...duplicateGroups.map(g => g.files.length))
            : 0;
        return {
            groups: duplicateGroups,
            totalDuplicateFiles,
            wastedSpace,
            statistics: {
                totalFilesScanned: filteredFiles.length,
                uniqueFiles: filteredFiles.length - totalDuplicateFiles,
                duplicateGroups: duplicateGroups.length,
                largestDuplicateGroup
            }
        };
    }
    async collectFiles(dirPath, allFiles, recursive) {
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                if (entry.isDirectory()) {
                    if (recursive) {
                        await this.collectFiles(fullPath, allFiles, recursive);
                    }
                }
                else if (entry.isFile()) {
                    allFiles.push(fullPath);
                }
            }
        }
        catch (error) {
            console.error(`Error reading directory ${dirPath}:`, error);
        }
    }
    async calculateFileHash(filePath, algorithm) {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash(algorithm);
            const stream = fs.createReadStream(filePath);
            stream.on('data', (data) => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }
    async findDuplicatesByContent(filePaths, algorithm = 'sha256') {
        const hashToFiles = new Map();
        for (const filePath of filePaths) {
            try {
                const hash = await this.calculateFileHash(filePath, algorithm);
                if (!hashToFiles.has(hash)) {
                    hashToFiles.set(hash, []);
                }
                hashToFiles.get(hash).push(filePath);
            }
            catch (error) {
                console.error(`Error processing file ${filePath}:`, error);
            }
        }
        const duplicateGroups = [];
        for (const [hash, files] of hashToFiles.entries()) {
            if (files.length > 1) {
                const size = fs.statSync(files[0]).size;
                duplicateGroups.push({ hash, size, files });
            }
        }
        return duplicateGroups;
    }
    async generateDuplicateReport(result, format = 'text') {
        switch (format) {
            case 'json':
                return JSON.stringify(result, null, 2);
            case 'csv':
                return this.generateCSVReport(result);
            case 'text':
            default:
                return this.generateTextReport(result);
        }
    }
    generateTextReport(result) {
        const lines = [];
        lines.push('=== DUPLICATE FILE DETECTION REPORT ===');
        lines.push(`Generated: ${new Date().toISOString()}`);
        lines.push('');
        lines.push('SUMMARY:');
        lines.push(`- Total Files Scanned: ${result.statistics.totalFilesScanned}`);
        lines.push(`- Unique Files: ${result.statistics.uniqueFiles}`);
        lines.push(`- Duplicate Groups: ${result.statistics.duplicateGroups}`);
        lines.push(`- Total Duplicate Files: ${result.totalDuplicateFiles}`);
        lines.push(`- Wasted Space: ${this.formatBytes(result.wastedSpace)}`);
        lines.push(`- Largest Duplicate Group: ${result.statistics.largestDuplicateGroup} files`);
        lines.push('');
        if (result.groups.length > 0) {
            lines.push('DUPLICATE GROUPS (sorted by wasted space):');
            lines.push('');
            result.groups.forEach((group, index) => {
                const wastedSpace = (group.files.length - 1) * group.size;
                lines.push(`Group ${index + 1}:`);
                lines.push(`  Hash: ${group.hash}`);
                lines.push(`  File Size: ${this.formatBytes(group.size)}`);
                lines.push(`  Files: ${group.files.length}`);
                lines.push(`  Wasted Space: ${this.formatBytes(wastedSpace)}`);
                lines.push(`  Files:`);
                group.files.forEach(file => {
                    lines.push(`    - ${file}`);
                });
                lines.push('');
            });
        }
        else {
            lines.push('No duplicate files found!');
        }
        return lines.join('\n');
    }
    generateCSVReport(result) {
        const rows = [];
        rows.push('Group,Hash,FileSize,FileCount,WastedSpace,FilePath');
        result.groups.forEach((group, index) => {
            const wastedSpace = (group.files.length - 1) * group.size;
            group.files.forEach(file => {
                rows.push(`${index + 1},${group.hash},${group.size},${group.files.length},${wastedSpace},"${file}"`);
            });
        });
        return rows.join('\n');
    }
    formatBytes(bytes) {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    async suggestDuplicateResolution(result) {
        const suggestions = [];
        for (const group of result.groups) {
            let recommendation = '';
            let reasoning = '';
            // Analyze file paths to suggest which to keep
            const files = group.files;
            const pathAnalysis = this.analyzeFilePaths(files);
            if (pathAnalysis.hasBackupDir) {
                recommendation = `Keep files outside backup directories, remove duplicates in backup folders`;
                reasoning = 'Files in backup directories are likely redundant copies';
            }
            else if (pathAnalysis.hasVersionedFiles) {
                recommendation = `Keep the most recent version, remove older versions`;
                reasoning = 'Multiple versions detected - latest version is typically preferred';
            }
            else if (pathAnalysis.hasDescriptiveNames && pathAnalysis.hasGenericNames) {
                recommendation = `Keep files with descriptive names, remove generically named duplicates`;
                reasoning = 'Descriptive filenames are more meaningful than generic names';
            }
            else {
                recommendation = `Review manually - keep file in most logical location`;
                reasoning = 'Unable to determine clear preference automatically';
            }
            suggestions.push({
                group,
                recommendation,
                reasoning
            });
        }
        return suggestions;
    }
    analyzeFilePaths(files) {
        const backupDirPatterns = [/backup/i, /bak/i, /archive/i, /old/i];
        const versionPatterns = [/v\d+/i, /version/i, /\d{4}-\d{2}-\d{2}/i, /copy\s*\(\d+\)/i];
        const genericNamePatterns = [/^copy/i, /untitled/i, /new\s+file/i, /document\d*/i];
        const hasBackupDir = files.some(file => backupDirPatterns.some(pattern => pattern.test(file)));
        const hasVersionedFiles = files.some(file => versionPatterns.some(pattern => pattern.test(path.basename(file))));
        const hasGenericNames = files.some(file => genericNamePatterns.some(pattern => pattern.test(path.basename(file))));
        const hasDescriptiveNames = files.some(file => {
            const basename = path.basename(file, path.extname(file));
            return basename.length > 10 && !genericNamePatterns.some(pattern => pattern.test(basename));
        });
        return {
            hasBackupDir,
            hasVersionedFiles,
            hasDescriptiveNames,
            hasGenericNames
        };
    }
}
