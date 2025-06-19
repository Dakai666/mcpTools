/**
 * arXiv 學術論文引擎
 * 基於 arxiv-mcp-server 擴展實現
 */

import { 
  ArxivPaper, 
  ArxivSearchFilters, 
  DeepPaperAnalysis,
  Citation,
  APIResponse 
} from '../types/index.js';
import { CacheManager } from '../services/CacheManager.js';
import { PdfDownloader } from '../services/PdfDownloader.js';
import { PdfTextExtractor } from '../services/PdfTextExtractor.js';

export class ArxivEngine {
  private baseUrls = [
    'https://export.arxiv.org/api/query',  // 原始 API
    'http://export.arxiv.org/api/query',   // HTTP 回退
    'https://arxiv.org/api/query',         // 主站 API (會重定向)
  ];
  private currentBaseUrl: string = '';
  private isInitialized = false;
  private cacheManager: CacheManager;
  private pdfDownloader: PdfDownloader;
  private textExtractor: PdfTextExtractor;

  constructor() {
    this.cacheManager = new CacheManager();
    this.pdfDownloader = new PdfDownloader(this.cacheManager);
    this.textExtractor = new PdfTextExtractor(this.cacheManager);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('🚀 Initializing arXiv Engine v3.1 with multiple endpoints...');
    
    // 測試所有可用端點並選擇最佳的
    const workingEndpoint = await this.findWorkingEndpoint();
    
    if (workingEndpoint) {
      this.currentBaseUrl = workingEndpoint;
      console.log(`✅ arXiv Engine initialized with endpoint: ${this.currentBaseUrl}`);
    } else {
      console.warn('⚠️ All arXiv endpoints failed, continuing with degraded functionality');
      this.currentBaseUrl = this.baseUrls[0]; // 使用預設端點
    }
    
    this.isInitialized = true;
  }

  /**
   * 測試並找到可用的 arXiv API 端點
   */
  private async findWorkingEndpoint(): Promise<string | null> {
    console.log('🔍 Testing arXiv API endpoints...');
    
    for (const baseUrl of this.baseUrls) {
      try {
        console.log(`   Testing: ${baseUrl}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超時
        
        const testResponse = await fetch(
          `${baseUrl}?search_query=cat:cs.AI&max_results=1`,
          { 
            signal: controller.signal,
            headers: {
              'User-Agent': 'Academic-Knowledge-MCP/2.5 (https://github.com/example/academic-mcp)'
            }
          }
        );
        
        clearTimeout(timeoutId);
        
        if (testResponse.ok) {
          console.log(`   ✅ Success: ${baseUrl} (${testResponse.status})`);
          return baseUrl;
        } else {
          console.log(`   ❌ Failed: ${baseUrl} (${testResponse.status})`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`   ❌ Error: ${baseUrl} (${errorMessage})`);
      }
    }
    
    return null;
  }

  /**
   * 增強的請求方法，支援重試和端點切換
   */
  private async makeRequest(url: string, retries: number = 2): Promise<Response> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超時
        
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Academic-Knowledge-MCP/3.1 (https://github.com/example/academic-mcp)',
            'Accept': 'application/atom+xml,application/xml,text/xml',
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          return response;
        }
        
        if (attempt < retries) {
          console.log(`   Attempt ${attempt + 1} failed (${response.status}), retrying...`);
          await this.delay(1000 * (attempt + 1)); // 指數退避
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
      } catch (error) {
        if (attempt < retries) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.log(`   Attempt ${attempt + 1} failed (${errorMessage}), retrying...`);
          await this.delay(1000 * (attempt + 1)); // 指數退避
        } else {
          throw error;
        }
      }
    }
    
    throw new Error('All retry attempts failed');
  }

  /**
   * 延遲函數
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 搜索學術論文
   */
  async searchPapers(
    query: string, 
    filters: ArxivSearchFilters = {}
  ): Promise<APIResponse<ArxivPaper[]>> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    
    try {
      const searchQuery = this.buildSearchQuery(query, filters);
      const url = `${this.currentBaseUrl}?${searchQuery}`;
      
      console.log(`🔍 Searching arXiv for: "${query}" via ${this.currentBaseUrl}`);
      
      const response = await this.makeRequest(url);
      if (!response.ok) {
        throw new Error(`arXiv search failed: ${response.status}`);
      }

      const xmlText = await response.text();
      const papers = this.parseArxivResponse(xmlText);
      
      console.log(`Found ${papers.length} papers from arXiv`);

      return {
        success: true,
        data: papers,
        metadata: {
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
          version: '1.0.0'
        }
      };

    } catch (error) {
      console.error('arXiv search error:', error);
      return {
        success: false,
        error: {
          code: 'ARXIV_SEARCH_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          source: 'arxiv',
          retryable: true
        },
        metadata: {
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
          version: '1.0.0'
        }
      };
    }
  }

  /**
   * 下載論文內容 - v2.0 真實下載和解析
   */
  async downloadPaper(arxivId: string): Promise<APIResponse<string>> {
    const startTime = Date.now();
    
    try {
      console.log(`🚀 v2.0 真實下載論文: ${arxivId}`);
      
      // 第一步：下載 PDF 文件
      const downloadResult = await this.pdfDownloader.downloadPdf(arxivId);
      if (!downloadResult.success) {
        throw new Error(`PDF 下載失敗: ${downloadResult.error?.message}`);
      }

      // 第二步：提取文本內容
      const extractResult = await this.textExtractor.extractText(arxivId);
      if (!extractResult.success) {
        throw new Error(`文本提取失敗: ${extractResult.error?.message}`);
      }

      const pdfContent = extractResult.data!.content;
      
      // 返回詳細的提取結果
      const resultSummary = `
📄 論文解析完成: ${arxivId}
📊 統計信息:
  - 總頁數: ${pdfContent.pageCount}
  - 總字數: ${pdfContent.wordCount}
  - 章節數: ${pdfContent.sections.length}
  - 圖表數: ${pdfContent.figures.length + pdfContent.tables.length}
  - 參考文獻: ${pdfContent.references.length}

📝 章節結構:
${pdfContent.sections.map(s => `  ${s.level === 1 ? '●' : '○'} ${s.title} (${s.wordCount} 詞)`).join('\n')}

✅ 完整文本已存儲到本地緩存
🔗 原始 PDF: https://arxiv.org/pdf/${arxivId}.pdf
`;

      console.log(`✅ 論文下載和解析完成: ${arxivId} (${pdfContent.wordCount} 詞)`);

      return {
        success: true,
        data: resultSummary,
        metadata: {
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
          version: '2.0.0',
          fullContent: pdfContent,
          downloadTime: downloadResult.data?.downloadTime || 0,
          extractionTime: extractResult.data?.extractionTime || 0
        }
      };

    } catch (error) {
      console.error('❌ v2.0 論文下載失敗:', error);
      return {
        success: false,
        error: {
          code: 'ARXIV_DOWNLOAD_ERROR_V2',
          message: error instanceof Error ? error.message : 'Unknown error',
          source: 'arxiv_v2',
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
   * 深度論文分析
   */
  async analyzePaper(paperId: string): Promise<APIResponse<DeepPaperAnalysis>> {
    const startTime = Date.now();
    
    try {
      // 首先獲取論文基本信息
      const searchResult = await this.searchPapers(`id:${paperId}`, { maxResults: 1 });
      
      if (!searchResult.success || !searchResult.data || searchResult.data.length === 0) {
        throw new Error(`Paper not found: ${paperId}`);
      }

      const paper = searchResult.data[0];
      
      // 基於摘要進行簡單分析（實際實現中可以更復雜）
      const analysis: DeepPaperAnalysis = {
        summary: paper.abstract,
        methodology: this.extractMethodologyFromAbstract(paper.abstract),
        keyFindings: this.extractKeyFindings(paper.abstract),
        limitations: this.extractLimitations(paper.abstract),
        futureWork: this.extractFutureWork(paper.abstract),
        significance: this.calculateSignificance(paper),
        complexity: this.calculateComplexity(paper)
      };

      console.log(`Analysis completed for paper: ${paper.title}`);

      return {
        success: true,
        data: analysis,
        metadata: {
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
          version: '1.0.0'
        }
      };

    } catch (error) {
      console.error('Paper analysis error:', error);
      return {
        success: false,
        error: {
          code: 'ARXIV_ANALYSIS_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          source: 'arxiv',
          retryable: true
        },
        metadata: {
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
          version: '1.0.0'
        }
      };
    }
  }

  /**
   * 尋找相關研究
   */
  async findRelatedWork(paperId: string): Promise<APIResponse<ArxivPaper[]>> {
    const startTime = Date.now();
    
    try {
      // 首先獲取目標論文
      const searchResult = await this.searchPapers(`id:${paperId}`, { maxResults: 1 });
      
      if (!searchResult.success || !searchResult.data || searchResult.data.length === 0) {
        throw new Error(`Paper not found: ${paperId}`);
      }

      const paper = searchResult.data[0];
      
      // 基於標題和類別尋找相關論文
      const keywords = this.extractKeywords(paper.title + ' ' + paper.abstract);
      const relatedQuery = keywords.slice(0, 3).join(' AND ');
      
      const relatedResult = await this.searchPapers(relatedQuery, { 
        maxResults: 10,
        categories: paper.categories 
      });

      if (!relatedResult.success) {
        throw new Error('Failed to find related work');
      }

      // 過濾掉原論文
      const relatedPapers = relatedResult.data?.filter(p => p.id !== paperId) || [];
      
      console.log(`Found ${relatedPapers.length} related papers`);

      return {
        success: true,
        data: relatedPapers,
        metadata: {
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
          version: '1.0.0'
        }
      };

    } catch (error) {
      console.error('Related work search error:', error);
      return {
        success: false,
        error: {
          code: 'ARXIV_RELATED_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          source: 'arxiv',
          retryable: true
        },
        metadata: {
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
          version: '1.0.0'
        }
      };
    }
  }

  // ===== 私有輔助方法 =====

  private buildSearchQuery(query: string, filters: ArxivSearchFilters): string {
    const params = new URLSearchParams();
    
    // 基本搜索查詢
    params.append('search_query', `all:${query}`);
    
    // 結果數量
    params.append('max_results', (filters.maxResults || 10).toString());
    
    // 排序方式
    if (filters.sortBy) {
      params.append('sortBy', filters.sortBy);
    }
    
    // 日期範圍（簡化實現）
    if (filters.startDate || filters.endDate) {
      // arXiv API 的日期過濾較為複雜，這裡只是示例
      console.log('Date filtering requested but not implemented in this version');
    }
    
    return params.toString();
  }

  private parseArxivResponse(xmlText: string): ArxivPaper[] {
    // 簡化的 XML 解析（實際實現中應該使用專門的 XML 解析庫）
    const papers: ArxivPaper[] = [];
    
    // 這裡是一個非常簡化的解析邏輯
    // 實際實現中需要使用 DOMParser 或 xml2js 等庫
    
    const entryMatches = xmlText.match(/<entry[^>]*>([\s\S]*?)<\/entry>/g) || [];
    
    for (const entryXml of entryMatches) {
      try {
        const paper = this.parseEntry(entryXml);
        if (paper) {
          papers.push(paper);
        }
      } catch (error) {
        console.warn('Failed to parse entry:', error);
      }
    }
    
    return papers;
  }

  private parseEntry(entryXml: string): ArxivPaper | null {
    try {
      // 簡化的解析邏輯 - 實際實現需要更健壯的 XML 解析
      const id = this.extractXmlContent(entryXml, 'id') || '';
      const title = this.extractXmlContent(entryXml, 'title') || '';
      const summary = this.extractXmlContent(entryXml, 'summary') || '';
      const published = this.extractXmlContent(entryXml, 'published') || '';
      
      // 提取 arXiv ID
      const arxivId = id.split('/').pop()?.replace('v1', '') || '';
      
      // 提取作者（簡化）
      const authorMatches = entryXml.match(/<name>([^<]+)<\/name>/g) || [];
      const authors = authorMatches.map(match => 
        match.replace(/<\/?name>/g, '').trim()
      );
      
      // 提取分類
      const categoryMatches = entryXml.match(/<category\s+term="([^"]+)"/g) || [];
      const categories = categoryMatches.map(match => 
        match.match(/term="([^"]+)"/)?.[1] || ''
      ).filter(Boolean);

      return {
        id: arxivId,
        title: title.trim(),
        authors,
        abstract: summary.trim(),
        categories,
        publishedDate: new Date(published),
        pdfUrl: `https://arxiv.org/pdf/${arxivId}.pdf`,
        citation: {
          title: title.trim(),
          authors,
          year: new Date(published).getFullYear(),
          source: 'arXiv',
          url: `https://arxiv.org/abs/${arxivId}`
        }
      };
    } catch (error) {
      console.warn('Failed to parse paper entry:', error);
      return null;
    }
  }

  private extractXmlContent(xml: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : null;
  }

  private extractMethodologyFromAbstract(abstract: string): string {
    // 簡化的方法論提取邏輯
    const methodKeywords = ['method', 'approach', 'algorithm', 'technique', 'framework'];
    const sentences = abstract.split('.').filter(s => s.trim().length > 0);
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (methodKeywords.some(keyword => lowerSentence.includes(keyword))) {
        return sentence.trim() + '.';
      }
    }
    
    return 'Methodology not clearly identified in abstract.';
  }

  private extractKeyFindings(abstract: string): string[] {
    // 簡化的關鍵發現提取邏輯
    const resultKeywords = ['result', 'finding', 'show', 'demonstrate', 'achieve', 'improve'];
    const sentences = abstract.split('.').filter(s => s.trim().length > 0);
    const findings: string[] = [];
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (resultKeywords.some(keyword => lowerSentence.includes(keyword))) {
        findings.push(sentence.trim() + '.');
      }
    }
    
    return findings.length > 0 ? findings : ['Key findings not clearly identified in abstract.'];
  }

  private extractLimitations(abstract: string): string[] {
    // 尋找限制性描述
    const limitationKeywords = ['limitation', 'challenge', 'however', 'but', 'although'];
    const sentences = abstract.split('.').filter(s => s.trim().length > 0);
    const limitations: string[] = [];
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (limitationKeywords.some(keyword => lowerSentence.includes(keyword))) {
        limitations.push(sentence.trim() + '.');
      }
    }
    
    return limitations.length > 0 ? limitations : ['Limitations not explicitly mentioned in abstract.'];
  }

  private extractFutureWork(abstract: string): string[] {
    // 尋找未來工作描述
    const futureKeywords = ['future', 'next', 'extend', 'improve', 'further', 'ongoing'];
    const sentences = abstract.split('.').filter(s => s.trim().length > 0);
    const futureWork: string[] = [];
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (futureKeywords.some(keyword => lowerSentence.includes(keyword))) {
        futureWork.push(sentence.trim() + '.');
      }
    }
    
    return futureWork.length > 0 ? futureWork : ['Future work directions not specified in abstract.'];
  }

  private calculateSignificance(paper: ArxivPaper): number {
    // 簡化的重要性評估
    let score = 5; // 基礎分數
    
    // 基於分類調整（某些領域可能更重要）
    if (paper.categories.some(cat => cat.includes('cs.AI') || cat.includes('cs.LG'))) {
      score += 2;
    }
    
    // 基於標題關鍵詞
    const importantKeywords = ['breakthrough', 'novel', 'state-of-the-art', 'significant'];
    const titleLower = paper.title.toLowerCase();
    if (importantKeywords.some(keyword => titleLower.includes(keyword))) {
      score += 1;
    }
    
    return Math.min(score, 10);
  }

  private calculateComplexity(paper: ArxivPaper): number {
    // 簡化的複雜度評估
    let score = 5; // 基礎分數
    
    // 基於摘要長度
    if (paper.abstract.length > 1500) {
      score += 2;
    }
    
    // 基於分類（某些領域可能更複雜）
    if (paper.categories.some(cat => cat.includes('math') || cat.includes('physics'))) {
      score += 1;
    }
    
    // 基於技術性詞彙
    const complexKeywords = ['theorem', 'proof', 'optimization', 'algorithm'];
    const abstractLower = paper.abstract.toLowerCase();
    const complexTerms = complexKeywords.filter(keyword => abstractLower.includes(keyword));
    score += Math.min(complexTerms.length, 2);
    
    return Math.min(score, 10);
  }

  private extractKeywords(text: string): string[] {
    // 簡化的關鍵詞提取
    const words = text.toLowerCase()
      .replace(/[^a-z0-9\\s]/g, ' ')
      .split(/\\s+/)
      .filter(word => word.length > 3);
    
    // 統計詞頻
    const wordCount = new Map<string, number>();
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });
    
    // 返回出現頻率最高的詞
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  async terminate(): Promise<void> {
    this.isInitialized = false;
    console.log('arXiv Engine terminated');
  }
}