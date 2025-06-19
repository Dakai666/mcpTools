/**
 * PDF 文本提取器
 * 使用 pdf-parse 從 PDF 文件中提取完整文本和結構化內容
 */

import pdfParse from 'pdf-parse';
import { CacheManager } from './CacheManager.js';
import { APIResponse } from '../types/index.js';

export interface PdfContent {
  rawText: string;
  wordCount: number;
  pageCount: number;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
  };
  sections: PdfSection[];
  figures: Figure[];
  tables: Table[];
  references: Reference[];
}

export interface PdfSection {
  title: string;
  content: string;
  startPage: number;
  level: number; // 1 = 主標題, 2 = 次標題, etc.
  wordCount: number;
}

export interface Figure {
  caption: string;
  pageNumber: number;
  figureNumber: string;
}

export interface Table {
  caption: string;
  pageNumber: number;
  tableNumber: string;
}

export interface Reference {
  text: string;
  authors?: string[];
  title?: string;
  year?: number;
  venue?: string;
}

export interface ExtractionResult {
  paperId: string;
  content: PdfContent;
  extractionTime: number;
  success: boolean;
  error?: string;
}

export class PdfTextExtractor {
  private cacheManager: CacheManager;

  constructor(cacheManager: CacheManager) {
    this.cacheManager = cacheManager;
  }

  /**
   * 從 PDF 文件提取完整文本內容
   */
  async extractText(arxivId: string): Promise<APIResponse<ExtractionResult>> {
    const startTime = Date.now();
    
    try {
      console.log(`📄 開始解析 PDF: ${arxivId}`);
      
      // 檢查是否已經解析過
      if (await this.cacheManager.exists('arxiv', 'processed', arxivId)) {
        console.log(`✅ 已存在解析結果: ${arxivId}`);
        const cached = await this.cacheManager.retrieve('arxiv', 'processed', arxivId);
        if (cached) {
          return {
            success: true,
            data: {
              paperId: arxivId,
              content: JSON.parse(cached.content.toString()),
              extractionTime: 0,
              success: true
            },
            metadata: {
              timestamp: new Date(),
              processingTime: Date.now() - startTime,
              version: '2.0.0'
            }
          };
        }
      }

      // 獲取原始 PDF 文件
      const pdfFile = await this.cacheManager.retrieve('arxiv', 'raw', arxivId);
      if (!pdfFile) {
        throw new Error(`PDF 文件不存在: ${arxivId}`);
      }

      // 使用 pdf-parse 解析 PDF
      const pdfData = await pdfParse(pdfFile.content);
      
      console.log(`📊 PDF 基本信息: ${pdfData.numpages} 頁, ${pdfData.text.length} 字符`);

      // 結構化解析文本
      const content = await this.parseStructuredContent(pdfData, arxivId);
      
      // 存儲解析結果
      await this.cacheManager.store('arxiv', 'processed', arxivId, JSON.stringify(content, null, 2), {
        extractionDate: new Date(),
        pdfInfo: pdfData.info,
        wordCount: content.wordCount,
        pageCount: content.pageCount,
        processingVersion: '2.0.0'
      });

      const result: ExtractionResult = {
        paperId: arxivId,
        content,
        extractionTime: Date.now() - startTime,
        success: true
      };

      console.log(`✅ PDF 解析完成: ${arxivId} (${content.wordCount} 詞, ${content.sections.length} 節)`);

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
          version: '2.0.0'
        }
      };

    } catch (error) {
      console.error(`❌ PDF 解析失敗: ${arxivId}`, error);
      
      return {
        success: false,
        error: {
          code: 'PDF_EXTRACTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown extraction error',
          source: 'pdf_extractor',
          retryable: true
        },
        metadata: {
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
          version: '2.0.0'
        }
      };
    }
  }

  /**
   * 批量提取多個 PDF 的文本
   */
  async extractBatch(arxivIds: string[]): Promise<APIResponse<ExtractionResult[]>> {
    const startTime = Date.now();
    const results: ExtractionResult[] = [];
    
    try {
      console.log(`📄 批量解析: ${arxivIds.length} 個 PDF`);
      
      for (const arxivId of arxivIds) {
        const result = await this.extractText(arxivId);
        if (result.success && result.data) {
          results.push(result.data);
        } else {
          results.push({
            paperId: arxivId,
            content: {} as PdfContent,
            extractionTime: 0,
            success: false,
            error: result.error?.message || 'Unknown error'
          });
        }
        
        // 短暫暫停避免過度負載
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const successful = results.filter(r => r.success).length;
      console.log(`✅ 批量解析完成: ${successful}/${arxivIds.length} 成功`);

      return {
        success: true,
        data: results,
        metadata: {
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
          version: '2.0.0'
        }
      };

    } catch (error) {
      console.error('批量解析失敗', error);
      
      return {
        success: false,
        error: {
          code: 'BATCH_EXTRACTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown batch error',
          source: 'pdf_extractor',
          retryable: true
        },
        metadata: {
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
          version: '2.0.0'
        }
      };
    }
  }

  // ===== 私有方法 =====

  private async parseStructuredContent(pdfData: any, arxivId: string): Promise<PdfContent> {
    const rawText = pdfData.text;
    const lines = rawText.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0);
    
    // 基本統計
    const words = rawText.match(/\b\w+\b/g) || [];
    const wordCount = words.length;
    
    // 解析章節
    const sections = this.extractSections(lines);
    
    // 解析圖表
    const figures = this.extractFigures(lines);
    const tables = this.extractTables(lines);
    
    // 解析參考文獻  
    const references = this.extractReferences(lines);
    
    // 提取元數據
    const metadata = this.extractMetadata(pdfData.info);

    return {
      rawText,
      wordCount,
      pageCount: pdfData.numpages,
      metadata,
      sections,
      figures,
      tables,
      references
    };
  }

  private extractSections(lines: string[]): PdfSection[] {
    const sections: PdfSection[] = [];
    let currentSection: PdfSection | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 檢測章節標題
      const sectionInfo = this.detectSectionHeader(line, i);
      
      if (sectionInfo) {
        // 保存前一個章節
        if (currentSection) {
          currentSection.wordCount = (currentSection.content.match(/\b\w+\b/g) || []).length;
          sections.push(currentSection);
        }
        
        // 開始新章節
        currentSection = {
          title: sectionInfo.title,
          content: '',
          startPage: Math.floor(i / 50) + 1, // 簡化的頁面估算
          level: sectionInfo.level,
          wordCount: 0
        };
      } else if (currentSection) {
        // 添加到當前章節
        currentSection.content += line + '\n';
      }
    }
    
    // 添加最後一個章節
    if (currentSection) {
      currentSection.wordCount = (currentSection.content.match(/\b\w+\b/g) || []).length;
      sections.push(currentSection);
    }
    
    return sections;
  }

  private detectSectionHeader(line: string, lineIndex: number): { title: string; level: number } | null {
    // 常見的章節標題模式
    const patterns = [
      { regex: /^(\d+\.?\s+)([A-Z][^a-z]*[A-Z])$/, level: 1 },           // 1. INTRODUCTION
      { regex: /^(\d+\.\d+\.?\s+)([A-Z][^a-z]*[A-Z])$/, level: 2 },     // 1.1. METHODOLOGY  
      { regex: /^(Abstract|ABSTRACT)$/, level: 1 },
      { regex: /^(Introduction|INTRODUCTION)$/, level: 1 },
      { regex: /^(Methodology|METHODOLOGY|Methods|METHODS)$/, level: 1 },
      { regex: /^(Results|RESULTS)$/, level: 1 },
      { regex: /^(Discussion|DISCUSSION)$/, level: 1 },
      { regex: /^(Conclusion|CONCLUSION|Conclusions|CONCLUSIONS)$/, level: 1 },
      { regex: /^(References|REFERENCES|Bibliography|BIBLIOGRAPHY)$/, level: 1 },
      { regex: /^(Acknowledgments|ACKNOWLEDGMENTS|Acknowledgements|ACKNOWLEDGEMENTS)$/, level: 1 }
    ];
    
    for (const pattern of patterns) {
      const match = line.match(pattern.regex);
      if (match) {
        return {
          title: line,
          level: pattern.level
        };
      }
    }
    
    return null;
  }

  private extractFigures(lines: string[]): Figure[] {
    const figures: Figure[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 查找圖標題模式
      const figureMatch = line.match(/^(Figure|Fig\.?)\s+(\d+)[:.]\s*(.+)$/i);
      if (figureMatch) {
        figures.push({
          figureNumber: figureMatch[2],
          caption: figureMatch[3],
          pageNumber: Math.floor(i / 50) + 1
        });
      }
    }
    
    return figures;
  }

  private extractTables(lines: string[]): Table[] {
    const tables: Table[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 查找表格標題模式
      const tableMatch = line.match(/^(Table|Tab\.?)\s+(\d+)[:.]\s*(.+)$/i);
      if (tableMatch) {
        tables.push({
          tableNumber: tableMatch[2],
          caption: tableMatch[3],
          pageNumber: Math.floor(i / 50) + 1
        });
      }
    }
    
    return tables;
  }

  private extractReferences(lines: string[]): Reference[] {
    const references: Reference[] = [];
    let inReferences = false;
    
    for (const line of lines.filter(line => line.length > 0)) {
      // 檢測參考文獻開始
      if (line.match(/^(References|REFERENCES|Bibliography|BIBLIOGRAPHY)$/)) {
        inReferences = true;
        continue;
      }
      
      if (inReferences) {
        // 簡單的參考文獻解析
        const refMatch = line.match(/^\[(\d+)\]\s*(.+)$/);
        if (refMatch) {
          const refText = refMatch[2];
          references.push({
            text: refText,
            // TODO: 更詳細的解析 (作者、標題、年份等)
          });
        }
      }
    }
    
    return references;
  }

  private extractMetadata(pdfInfo: any): PdfContent['metadata'] {
    return {
      title: pdfInfo?.Title,
      author: pdfInfo?.Author,
      subject: pdfInfo?.Subject,
      creator: pdfInfo?.Creator,
      producer: pdfInfo?.Producer,
      creationDate: pdfInfo?.CreationDate ? new Date(pdfInfo.CreationDate) : undefined,
      modificationDate: pdfInfo?.ModDate ? new Date(pdfInfo.ModDate) : undefined
    };
  }
}