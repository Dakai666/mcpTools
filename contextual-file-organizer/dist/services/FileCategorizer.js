import fs from 'fs-extra';
import path from 'path';
import { FileAnalyzer } from './FileAnalyzer.js';
export class FileCategorizer {
    fileAnalyzer;
    defaultCategories = [];
    constructor() {
        this.fileAnalyzer = new FileAnalyzer();
        this.initializeDefaultCategories();
    }
    initializeDefaultCategories() {
        this.defaultCategories = [
            // Documents & Reports
            {
                name: 'Reports',
                extensions: ['.pdf', '.doc', '.docx', '.ppt', '.pptx'],
                keywords: ['report', 'analysis', 'summary', 'annual', 'quarterly', 'monthly', 'presentation'],
                pathPatterns: [/reports?/i, /documents?/i, /presentations?/i],
                contentPatterns: [/executive summary/i, /conclusion/i, /findings/i, /recommendations/i],
                priority: 8
            },
            {
                name: 'Notes',
                extensions: ['.md', '.txt', '.note'],
                keywords: ['note', 'memo', 'draft', 'idea', 'todo', 'meeting'],
                pathPatterns: [/notes?/i, /memos?/i, /drafts?/i],
                contentPatterns: [/^#+ /m, /\- \[ \]/m, /meeting notes/i, /todo/i],
                priority: 7
            },
            {
                name: 'Contracts_Legal',
                extensions: ['.pdf', '.doc', '.docx'],
                keywords: ['contract', 'agreement', 'legal', 'terms', 'conditions', 'policy', 'nda'],
                pathPatterns: [/contracts?/i, /legal/i, /agreements?/i],
                contentPatterns: [/whereas/i, /terms and conditions/i, /agreement/i, /party/i],
                priority: 9
            },
            // Media
            {
                name: 'Images',
                extensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.tiff'],
                keywords: ['photo', 'image', 'picture', 'screenshot', 'icon'],
                pathPatterns: [/images?/i, /photos?/i, /pictures?/i, /icons?/i, /screenshots?/i],
                contentPatterns: [],
                priority: 6
            },
            {
                name: 'Videos',
                extensions: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm'],
                keywords: ['video', 'movie', 'clip', 'recording'],
                pathPatterns: [/videos?/i, /movies?/i, /clips?/i],
                contentPatterns: [],
                priority: 6
            },
            {
                name: 'Audio',
                extensions: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'],
                keywords: ['audio', 'music', 'sound', 'recording', 'podcast'],
                pathPatterns: [/audio/i, /music/i, /sounds?/i, /podcasts?/i],
                contentPatterns: [],
                priority: 6
            },
            // Code & Technical
            {
                name: 'Source_Code',
                extensions: ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt'],
                keywords: ['source', 'code', 'script', 'program'],
                pathPatterns: [/src/i, /source/i, /code/i, /scripts?/i],
                contentPatterns: [/function\s+\w+/i, /class\s+\w+/i, /import\s+/i, /from\s+\w+\s+import/i],
                priority: 7
            },
            {
                name: 'Configuration',
                extensions: ['.json', '.yaml', '.yml', '.xml', '.ini', '.cfg', '.conf', '.config'],
                keywords: ['config', 'configuration', 'settings', 'properties'],
                pathPatterns: [/config/i, /settings?/i, /conf/i],
                contentPatterns: [/^\s*[\{\[]/m, /^\s*\w+\s*[:=]/m],
                priority: 5
            },
            {
                name: 'Logs',
                extensions: ['.log', '.txt'],
                keywords: ['log', 'error', 'debug', 'trace', 'audit'],
                pathPatterns: [/logs?/i, /debug/i, /trace/i],
                contentPatterns: [/\d{4}-\d{2}-\d{2}/i, /ERROR|WARN|INFO|DEBUG/i, /exception/i],
                priority: 4
            },
            // Data & Spreadsheets
            {
                name: 'Spreadsheets',
                extensions: ['.xlsx', '.xls', '.csv', '.ods'],
                keywords: ['spreadsheet', 'data', 'table', 'budget', 'financial'],
                pathPatterns: [/data/i, /spreadsheets?/i, /excel/i],
                contentPatterns: [/,.*,.*,/m],
                priority: 6
            },
            {
                name: 'Databases',
                extensions: ['.db', '.sqlite', '.sql', '.mdb'],
                keywords: ['database', 'data', 'sql', 'query'],
                pathPatterns: [/database/i, /db/i, /sql/i],
                contentPatterns: [/SELECT\s+.*\s+FROM/i, /CREATE\s+TABLE/i],
                priority: 6
            },
            // Archives & Backups
            {
                name: 'Archives',
                extensions: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'],
                keywords: ['archive', 'backup', 'compressed'],
                pathPatterns: [/archives?/i, /backups?/i, /compressed/i],
                contentPatterns: [],
                priority: 3
            },
            // Finance & Business
            {
                name: 'Financial',
                extensions: ['.pdf', '.xlsx', '.xls', '.csv'],
                keywords: ['invoice', 'receipt', 'payment', 'financial', 'accounting', 'budget', 'expense', 'revenue'],
                pathPatterns: [/financial/i, /invoices?/i, /receipts?/i, /accounting/i, /budget/i],
                contentPatterns: [/total.*\$\d+/i, /invoice.*#/i, /payment/i, /\$\d+\.\d{2}/],
                priority: 8
            },
            // Temporary & Cache
            {
                name: 'Temporary',
                extensions: ['.tmp', '.temp', '.cache', '.bak'],
                keywords: ['temp', 'temporary', 'cache', 'backup'],
                pathPatterns: [/temp/i, /tmp/i, /cache/i, /\.bak$/i],
                contentPatterns: [],
                priority: 1
            }
        ];
    }
    async categorizeFiles(dirPath, customCategories) {
        const allFiles = await this.getAllFiles(dirPath);
        const categories = {};
        const uncategorized = [];
        const suggestions = [];
        // Initialize category buckets
        const activeCategories = customCategories || this.defaultCategories.map(cat => cat.name);
        activeCategories.forEach(cat => categories[cat] = []);
        // Categorize each file
        for (const filePath of allFiles) {
            const category = await this.categorizeFile(filePath);
            if (category && activeCategories.includes(category)) {
                categories[category].push(filePath);
            }
            else {
                uncategorized.push(filePath);
            }
        }
        // Remove empty categories
        Object.keys(categories).forEach(cat => {
            if (categories[cat].length === 0) {
                delete categories[cat];
            }
        });
        // Generate suggestions
        if (uncategorized.length > 0) {
            suggestions.push(...this.generateCategorizationSuggestions(uncategorized));
        }
        const totalFiles = allFiles.length;
        const categorizedFiles = totalFiles - uncategorized.length;
        return {
            categories,
            uncategorized,
            statistics: {
                totalFiles,
                categorizedFiles,
                categorizationRate: totalFiles > 0 ? (categorizedFiles / totalFiles) * 100 : 0
            },
            suggestions
        };
    }
    async categorizeFile(filePath) {
        const fileName = path.basename(filePath).toLowerCase();
        const ext = path.extname(filePath).toLowerCase();
        const dirName = path.dirname(filePath).toLowerCase();
        let bestMatch = null;
        for (const rule of this.defaultCategories) {
            let score = 0;
            // Extension match (high weight)
            if (rule.extensions.includes(ext)) {
                score += 10;
            }
            // Keyword match in filename (medium weight)
            const keywordMatches = rule.keywords.filter(keyword => fileName.includes(keyword.toLowerCase()));
            score += keywordMatches.length * 5;
            // Path pattern match (medium weight)
            const pathMatches = rule.pathPatterns.filter(pattern => pattern.test(dirName) || pattern.test(fileName));
            score += pathMatches.length * 4;
            // Content analysis for text files (lower weight but more accurate)
            if (this.isTextFile(ext) && rule.contentPatterns.length > 0) {
                try {
                    const contentScore = await this.analyzeFileContent(filePath, rule.contentPatterns);
                    score += contentScore * 3;
                }
                catch (error) {
                    // Content analysis failed, continue with other criteria
                }
            }
            // Apply priority multiplier
            score *= (rule.priority / 10);
            if (score > 0 && (!bestMatch || score > bestMatch.score)) {
                bestMatch = { category: rule.name, score };
            }
        }
        return bestMatch && bestMatch.score >= 3 ? bestMatch.category : null;
    }
    async analyzeFileContent(filePath, patterns) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const sampleContent = content.slice(0, 5000); // Analyze first 5KB
            return patterns.reduce((score, pattern) => {
                return pattern.test(sampleContent) ? score + 1 : score;
            }, 0);
        }
        catch (error) {
            return 0;
        }
    }
    isTextFile(ext) {
        const textExtensions = ['.txt', '.md', '.json', '.js', '.ts', '.py', '.java', '.cpp', '.c',
            '.html', '.css', '.xml', '.yaml', '.yml', '.csv', '.log', '.sql'];
        return textExtensions.includes(ext);
    }
    async getAllFiles(dirPath) {
        const files = [];
        async function scanDir(currentPath) {
            try {
                const entries = await fs.readdir(currentPath, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(currentPath, entry.name);
                    if (entry.isDirectory()) {
                        await scanDir(fullPath);
                    }
                    else if (entry.isFile()) {
                        files.push(fullPath);
                    }
                }
            }
            catch (error) {
                console.error(`Error scanning directory ${currentPath}:`, error);
            }
        }
        await scanDir(dirPath);
        return files;
    }
    generateCategorizationSuggestions(uncategorizedFiles) {
        const suggestions = [];
        const extensionCounts = {};
        const pathPatterns = {};
        // Analyze uncategorized files for patterns
        uncategorizedFiles.forEach(filePath => {
            const ext = path.extname(filePath).toLowerCase();
            const dirName = path.dirname(filePath).toLowerCase();
            extensionCounts[ext] = (extensionCounts[ext] || 0) + 1;
            // Extract potential category names from path
            const pathParts = dirName.split(path.sep).filter(part => part.length > 0);
            pathParts.forEach(part => {
                if (part.length > 2 && !['users', 'home', 'documents'].includes(part)) {
                    pathPatterns[part] = (pathPatterns[part] || 0) + 1;
                }
            });
        });
        // Generate suggestions based on common extensions
        Object.entries(extensionCounts)
            .filter(([ext, count]) => count >= 3 && ext)
            .forEach(([ext, count]) => {
            suggestions.push(`Consider creating a category for ${ext} files (${count} files found)`);
        });
        // Generate suggestions based on path patterns
        Object.entries(pathPatterns)
            .filter(([pattern, count]) => count >= 3)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .forEach(([pattern, count]) => {
            suggestions.push(`Consider creating a category for '${pattern}' files (${count} files found)`);
        });
        if (uncategorizedFiles.length > 50) {
            suggestions.push('Large number of uncategorized files - consider reviewing categorization rules');
        }
        return suggestions;
    }
    // Method to add custom category rules
    addCustomCategory(rule) {
        this.defaultCategories.push(rule);
        // Sort by priority (highest first)
        this.defaultCategories.sort((a, b) => b.priority - a.priority);
    }
    // Method to get category statistics
    getCategoryStatistics(categorizationResult) {
        const stats = {};
        Object.entries(categorizationResult.categories).forEach(([category, files]) => {
            stats[category] = {
                fileCount: files.length,
                percentage: (files.length / categorizationResult.statistics.totalFiles) * 100,
                extensions: this.getUniqueExtensions(files),
                avgFileSize: 0 // Could be enhanced to include size analysis
            };
        });
        return stats;
    }
    getUniqueExtensions(files) {
        const extensions = new Set(files.map(f => path.extname(f).toLowerCase()));
        return Array.from(extensions).filter(ext => ext.length > 0);
    }
}
