#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { FileAnalyzer } from './services/FileAnalyzer.js';
import { FileCategorizer } from './services/FileCategorizer.js';
import { DirectoryOrganizer } from './services/DirectoryOrganizer.js';
import { DuplicateDetector } from './services/DuplicateDetector.js';
class ContextualFileOrganizerServer {
    server;
    fileAnalyzer;
    fileCategorizer;
    directoryOrganizer;
    duplicateDetector;
    constructor() {
        this.server = new Server({
            name: 'contextual-file-organizer',
            version: '1.0.0',
        });
        this.fileAnalyzer = new FileAnalyzer();
        this.fileCategorizer = new FileCategorizer();
        this.directoryOrganizer = new DirectoryOrganizer();
        this.duplicateDetector = new DuplicateDetector();
        this.setupToolHandlers();
    }
    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: 'analyze_files',
                        description: 'Analyze files in a directory to extract content and metadata',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                path: { type: 'string', description: 'Directory path to analyze' },
                                recursive: { type: 'boolean', description: 'Analyze subdirectories recursively', default: true },
                                includeHidden: { type: 'boolean', description: 'Include hidden files', default: false }
                            },
                            required: ['path']
                        }
                    },
                    {
                        name: 'categorize_files',
                        description: 'Categorize files based on content analysis',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                path: { type: 'string', description: 'Directory path containing files to categorize' },
                                categories: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description: 'Custom categories (optional, uses smart detection if not provided)'
                                }
                            },
                            required: ['path']
                        }
                    },
                    {
                        name: 'organize_structure',
                        description: 'Create organized directory structure based on file categories',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                sourcePath: { type: 'string', description: 'Source directory path' },
                                targetPath: { type: 'string', description: 'Target directory path for organized structure' },
                                dryRun: { type: 'boolean', description: 'Preview changes without moving files', default: false },
                                createBackup: { type: 'boolean', description: 'Create backup before organizing', default: true }
                            },
                            required: ['sourcePath', 'targetPath']
                        }
                    },
                    {
                        name: 'detect_duplicates',
                        description: 'Detect duplicate files based on content hash',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                path: { type: 'string', description: 'Directory path to scan for duplicates' },
                                recursive: { type: 'boolean', description: 'Scan subdirectories recursively', default: true },
                                algorithm: { type: 'string', enum: ['md5', 'sha256'], description: 'Hash algorithm to use', default: 'sha256' }
                            },
                            required: ['path']
                        }
                    },
                    {
                        name: 'generate_report',
                        description: 'Generate comprehensive organization report',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                path: { type: 'string', description: 'Directory path to analyze' },
                                format: { type: 'string', enum: ['json', 'markdown', 'html'], description: 'Report format', default: 'markdown' },
                                includePreview: { type: 'boolean', description: 'Include file content previews', default: false }
                            },
                            required: ['path']
                        }
                    }
                ]
            };
        });
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                switch (name) {
                    case 'analyze_files':
                        return await this.handleAnalyzeFiles(args);
                    case 'categorize_files':
                        return await this.handleCategorizeFiles(args);
                    case 'organize_structure':
                        return await this.handleOrganizeStructure(args);
                    case 'detect_duplicates':
                        return await this.handleDetectDuplicates(args);
                    case 'generate_report':
                        return await this.handleGenerateReport(args);
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            }
            catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: ${error instanceof Error ? error.message : String(error)}`
                        }
                    ]
                };
            }
        });
    }
    async handleAnalyzeFiles(args) {
        const { path, recursive = true, includeHidden = false } = args;
        const analysis = await this.fileAnalyzer.analyzeDirectory(path, { recursive, includeHidden });
        return {
            content: [
                {
                    type: 'text',
                    text: `File Analysis Results for: ${path}\n\n` +
                        `Total Files: ${analysis.totalFiles}\n` +
                        `File Types: ${Object.keys(analysis.fileTypes).join(', ')}\n` +
                        `Total Size: ${this.formatBytes(analysis.totalSize)}\n\n` +
                        `Detailed Analysis:\n${JSON.stringify(analysis, null, 2)}`
                }
            ]
        };
    }
    async handleCategorizeFiles(args) {
        const { path, categories } = args;
        const categorization = await this.fileCategorizer.categorizeFiles(path, categories);
        return {
            content: [
                {
                    type: 'text',
                    text: `File Categorization Results:\n\n` +
                        Object.entries(categorization.categories)
                            .map(([category, files]) => `${category}: ${files.length} files`)
                            .join('\n') +
                        `\n\nDetailed Categorization:\n${JSON.stringify(categorization, null, 2)}`
                }
            ]
        };
    }
    async handleOrganizeStructure(args) {
        const { sourcePath, targetPath, dryRun = false, createBackup = true } = args;
        const result = await this.directoryOrganizer.organizeDirectory(sourcePath, targetPath, { dryRun, createBackup });
        return {
            content: [
                {
                    type: 'text',
                    text: `Directory Organization ${dryRun ? 'Preview' : 'Results'}:\n\n` +
                        `Files Processed: ${result.filesProcessed}\n` +
                        `Directories Created: ${result.directoriesCreated}\n` +
                        `${dryRun ? 'Would Move' : 'Moved'}: ${result.filesMoved} files\n\n` +
                        `Operations:\n${result.operations.map(op => `${op.action}: ${op.source} → ${op.target}`).join('\n')}`
                }
            ]
        };
    }
    async handleDetectDuplicates(args) {
        const { path, recursive = true, algorithm = 'sha256' } = args;
        const duplicates = await this.duplicateDetector.findDuplicates(path, { recursive, algorithm });
        return {
            content: [
                {
                    type: 'text',
                    text: `Duplicate Detection Results:\n\n` +
                        `Total Duplicate Groups: ${duplicates.groups.length}\n` +
                        `Total Duplicate Files: ${duplicates.totalDuplicateFiles}\n` +
                        `Space Wasted: ${this.formatBytes(duplicates.wastedSpace)}\n\n` +
                        `Duplicate Groups:\n${duplicates.groups.map((group, i) => `Group ${i + 1}: ${group.files.length} files (${this.formatBytes(group.size)})\n` +
                            group.files.map(f => `  - ${f}`).join('\n')).join('\n\n')}`
                }
            ]
        };
    }
    async handleGenerateReport(args) {
        const { path, format = 'markdown', includePreview = false } = args;
        // Combine all analysis results
        const analysis = await this.fileAnalyzer.analyzeDirectory(path);
        const categorization = await this.fileCategorizer.categorizeFiles(path);
        const duplicates = await this.duplicateDetector.findDuplicates(path);
        const report = this.generateComprehensiveReport(analysis, categorization, duplicates, format, includePreview);
        return {
            content: [
                {
                    type: 'text',
                    text: report
                }
            ]
        };
    }
    formatBytes(bytes) {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    generateComprehensiveReport(analysis, categorization, duplicates, format, includePreview) {
        const timestamp = new Date().toISOString();
        if (format === 'markdown') {
            return `# File Organization Report
Generated: ${timestamp}

## Summary
- **Total Files**: ${analysis.totalFiles}
- **Total Size**: ${this.formatBytes(analysis.totalSize)}
- **File Types**: ${Object.keys(analysis.fileTypes).length}
- **Categories**: ${Object.keys(categorization.categories).length}
- **Duplicate Groups**: ${duplicates.groups.length}
- **Space Wasted**: ${this.formatBytes(duplicates.wastedSpace)}

## File Distribution
${Object.entries(analysis.fileTypes).map(([type, count]) => `- **${type}**: ${count} files`).join('\n')}

## Categories
${Object.entries(categorization.categories).map(([cat, files]) => `- **${cat}**: ${files.length} files`).join('\n')}

## Recommendations
${this.generateRecommendations(analysis, categorization, duplicates)}
`;
        }
        return JSON.stringify({ analysis, categorization, duplicates, timestamp }, null, 2);
    }
    generateRecommendations(analysis, categorization, duplicates) {
        const recommendations = [];
        if (duplicates.groups.length > 0) {
            recommendations.push(`- Remove ${duplicates.totalDuplicateFiles} duplicate files to save ${this.formatBytes(duplicates.wastedSpace)}`);
        }
        if (Object.keys(categorization.categories).length > 5) {
            recommendations.push('- Consider consolidating similar categories for better organization');
        }
        if (analysis.totalFiles > 1000) {
            recommendations.push('- Large number of files detected - consider archiving old files');
        }
        return recommendations.length > 0 ? recommendations.join('\n') : '- Directory is well organized!';
    }
    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Contextual File Organizer MCP Server running on stdio');
    }
}
const server = new ContextualFileOrganizerServer();
server.start().catch(console.error);
