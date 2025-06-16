import fs from 'fs-extra';
import path from 'path';
// import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import sharp from 'sharp';
import crypto from 'crypto';

export interface FileAnalysisResult {
  totalFiles: number;
  totalSize: number;
  fileTypes: Record<string, number>;
  largestFiles: Array<{ path: string; size: number }>;
  oldestFiles: Array<{ path: string; mtime: Date }>;
  newestFiles: Array<{ path: string; mtime: Date }>;
  contentSummary: Record<string, any>;
}

export interface AnalysisOptions {
  recursive?: boolean;
  includeHidden?: boolean;
  maxContentSample?: number;
}

export class FileAnalyzer {
  private readonly supportedTextExtensions = ['.txt', '.md', '.json', '.js', '.ts', '.py', '.java', '.cpp', '.c', '.html', '.css', '.xml', '.yaml', '.yml'];
  private readonly supportedImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
  private readonly supportedDocumentExtensions = ['.pdf', '.doc', '.docx'];

  async analyzeDirectory(dirPath: string, options: AnalysisOptions = {}): Promise<FileAnalysisResult> {
    const { recursive = true, includeHidden = false, maxContentSample = 100 } = options;
    
    const result: FileAnalysisResult = {
      totalFiles: 0,
      totalSize: 0,
      fileTypes: {},
      largestFiles: [],
      oldestFiles: [],
      newestFiles: [],
      contentSummary: {}
    };

    const allFiles: Array<{ path: string; stats: fs.Stats }> = [];
    
    await this.scanDirectory(dirPath, allFiles, recursive, includeHidden);
    
    result.totalFiles = allFiles.length;
    
    // Sort files for analysis
    const filesBySize = [...allFiles].sort((a, b) => b.stats.size - a.stats.size);
    const filesByAge = [...allFiles].sort((a, b) => a.stats.mtime.getTime() - b.stats.mtime.getTime());
    const filesByRecent = [...allFiles].sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());
    
    // Analyze file types and sizes
    for (const file of allFiles) {
      const ext = path.extname(file.path).toLowerCase();
      result.fileTypes[ext] = (result.fileTypes[ext] || 0) + 1;
      result.totalSize += file.stats.size;
    }
    
    // Get top files
    result.largestFiles = filesBySize.slice(0, 10).map(f => ({ path: f.path, size: f.stats.size }));
    result.oldestFiles = filesByAge.slice(0, 10).map(f => ({ path: f.path, mtime: f.stats.mtime }));
    result.newestFiles = filesByRecent.slice(0, 10).map(f => ({ path: f.path, mtime: f.stats.mtime }));
    
    // Analyze content for sample files
    const sampleFiles = allFiles.slice(0, Math.min(maxContentSample, allFiles.length));
    result.contentSummary = await this.analyzeFileContents(sampleFiles);
    
    return result;
  }

  private async scanDirectory(dirPath: string, allFiles: Array<{ path: string; stats: fs.Stats }>, recursive: boolean, includeHidden: boolean): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!includeHidden && entry.name.startsWith('.')) continue;
        
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          if (recursive) {
            await this.scanDirectory(fullPath, allFiles, recursive, includeHidden);
          }
        } else if (entry.isFile()) {
          const stats = await fs.stat(fullPath);
          allFiles.push({ path: fullPath, stats });
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dirPath}:`, error);
    }
  }

  private async analyzeFileContents(files: Array<{ path: string; stats: fs.Stats }>): Promise<Record<string, any>> {
    const contentSummary: Record<string, any> = {
      textFiles: 0,
      imageFiles: 0,
      documentFiles: 0,
      codeFiles: 0,
      languages: {},
      keywords: {},
      averageFileSize: 0
    };

    let totalSize = 0;
    const keywordCount: Record<string, number> = {};

    for (const file of files) {
      const ext = path.extname(file.path).toLowerCase();
      totalSize += file.stats.size;

      if (this.supportedTextExtensions.includes(ext)) {
        contentSummary.textFiles++;
        
        if (['.js', '.ts', '.py', '.java', '.cpp', '.c'].includes(ext)) {
          contentSummary.codeFiles++;
          const lang = this.getLanguageFromExtension(ext);
          contentSummary.languages[lang] = (contentSummary.languages[lang] || 0) + 1;
        }

        // Analyze text content for keywords
        try {
          const content = await this.extractTextContent(file.path);
          if (content) {
            const words = this.extractKeywords(content);
            words.forEach(word => {
              keywordCount[word] = (keywordCount[word] || 0) + 1;
            });
          }
        } catch (error) {
          console.error(`Error analyzing content of ${file.path}:`, error);
        }
      } else if (this.supportedImageExtensions.includes(ext)) {
        contentSummary.imageFiles++;
      } else if (this.supportedDocumentExtensions.includes(ext)) {
        contentSummary.documentFiles++;
      }
    }

    // Get top keywords
    const sortedKeywords = Object.entries(keywordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20);
    
    contentSummary.keywords = Object.fromEntries(sortedKeywords);
    contentSummary.averageFileSize = files.length > 0 ? totalSize / files.length : 0;

    return contentSummary;
  }

  private async extractTextContent(filePath: string): Promise<string | null> {
    const ext = path.extname(filePath).toLowerCase();
    
    try {
      if (this.supportedTextExtensions.includes(ext)) {
        const content = await fs.readFile(filePath, 'utf-8');
        return content.slice(0, 5000); // Limit to first 5000 chars
      } else if (ext === '.pdf') {
        // PDF parsing temporarily disabled due to module issues
        return 'PDF content analysis temporarily unavailable';
      } else if (ext === '.docx') {
        const buffer = await fs.readFile(filePath);
        const result = await mammoth.extractRawText({ buffer });
        return result.value.slice(0, 5000);
      }
    } catch (error) {
      console.error(`Error extracting content from ${filePath}:`, error);
    }
    
    return null;
  }

  private extractKeywords(content: string): string[] {
    // Simple keyword extraction - can be enhanced with NLP
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && word.length < 20)
      .filter(word => !this.isCommonWord(word));
    
    return words;
  }

  private isCommonWord(word: string): boolean {
    const commonWords = [
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'man', 'men', 'oil', 'sit', 'son', 'add', 'ago', 'air', 'big', 'box', 'car', 'cut', 'end', 'far', 'got', 'gun', 'hot', 'job', 'let', 'lot', 'map', 'net', 'put', 'red', 'run', 'set', 'sun', 'top', 'use', 'way', 'win', 'yes', 'yet', 'add', 'any', 'ask', 'buy', 'eat', 'eye', 'few', 'fly', 'fun', 'hit', 'key', 'law', 'lay', 'leg', 'lie', 'lot', 'mix', 'own', 'pay', 'sea', 'shy', 'sit', 'sky', 'tax', 'ten', 'tie', 'try', 'war', 'win', 'yes'
    ];
    return commonWords.includes(word);
  }

  private getLanguageFromExtension(ext: string): string {
    const languageMap: Record<string, string> = {
      '.js': 'JavaScript',
      '.ts': 'TypeScript',
      '.py': 'Python',
      '.java': 'Java',
      '.cpp': 'C++',
      '.c': 'C',
      '.html': 'HTML',
      '.css': 'CSS',
      '.php': 'PHP',
      '.rb': 'Ruby',
      '.go': 'Go',
      '.rs': 'Rust',
      '.swift': 'Swift',
      '.kt': 'Kotlin'
    };
    
    return languageMap[ext] || 'Unknown';
  }

  async generateFileHash(filePath: string, algorithm: 'md5' | 'sha256' = 'sha256'): Promise<string> {
    const buffer = await fs.readFile(filePath);
    const hash = crypto.createHash(algorithm);
    hash.update(buffer);
    return hash.digest('hex');
  }
}