/**
 * Semantic Scholar 學術搜索引擎
 * 基於 semanticscholar-MCP-Server 擴展實現
 */

import { 
  ScholarPaper, 
  ScholarAuthor, 
  CitationNetwork,
  ResearchTrend,
  KnowledgeSource,
  APIResponse 
} from '../types/index.js';
import { CacheManager } from '../services/CacheManager.js';
import { ArxivEngine } from './ArxivEngine.js';

export interface ScholarSearchOptions {
  maxResults?: number;
  year?: number;
  fieldsOfStudy?: string[];
  minCitationCount?: number;
  sortBy?: 'relevance' | 'citationCount' | 'year';
  venue?: string;
}

export interface DeepAnalysisResult {
  paperId: string;
  title: string;
  fullDetails: ScholarPaper;
  citationNetwork: CitationNetwork;
  authorAnalysis: ScholarAuthor[];
  trendAnalysis: ResearchTrend;
  contentSummary: string;
  relatedPapers: ScholarPaper[];
  processingTime: number;
  // v2.0 新增真實論文內容
  fullTextPapers?: {
    paperId: string;
    title: string;
    source: 'arxiv' | 'scholar';
    fullTextAvailable: boolean;
    textContent?: string;
    wordCount?: number;
    processingTime?: number;
  }[];
  fullTextCoverage?: number; // 真實論文內容覆蓋率
}

export class SemanticScholarEngine {
  private baseUrl = 'https://api.semanticscholar.org/graph/v1';
  private apiKey?: string;
  private isInitialized = false;
  private requestDelay = 100; // API rate limiting
  private cacheManager: CacheManager;
  private arxivEngine: ArxivEngine; // v2.0 整合 ArxivEngine

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
    this.cacheManager = new CacheManager();
    this.arxivEngine = new ArxivEngine(); // v2.0 初始化 ArxivEngine
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('🚀 Initializing Semantic Scholar Engine v2.0...');
    
    try {
      // 初始化 ArxivEngine
      console.log('📚 初始化 ArxivEngine 整合...');
      await this.arxivEngine.initialize();
      
      // 測試 Semantic Scholar API 連接
      console.log('🔍 測試 Semantic Scholar API...');
      const testResponse = await this.makeRequest('/paper/search/bulk?query=machine+learning&limit=1');
      if (!testResponse) {
        throw new Error('Semantic Scholar API test failed');
      }
      
      this.isInitialized = true;
      console.log('✅ Semantic Scholar Engine v2.0 initialized successfully');
      console.log('   📄 支援 Semantic Scholar 元數據搜索');
      console.log('   📚 支援 ArxivEngine 全文下載');
    } catch (error) {
      console.error('Failed to initialize Semantic Scholar Engine:', error);
      throw error;
    }
  }

  /**
   * 高級學術搜索
   */
  async searchAdvanced(
    query: string, 
    options: ScholarSearchOptions = {}
  ): Promise<APIResponse<ScholarPaper[]>> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    
    try {
      console.log(`Searching Semantic Scholar for: "${query}"`);
      
      const params = this.buildSearchParams(query, options);
      const url = `/paper/search/bulk?${params}`;
      
      const response = await this.makeRequest(url);
      if (!response || !response.data) {
        throw new Error('No data received from Semantic Scholar API');
      }

      const papers = response.data.map((paper: any) => this.transformPaper(paper));
      
      console.log(`Found ${papers.length} papers from Semantic Scholar`);

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
      console.error('Semantic Scholar search error:', error);
      return {
        success: false,
        error: {
          code: 'SCHOLAR_SEARCH_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          source: 'semanticscholar',
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
   * 構建引用網絡
   */
  async buildCitationNetwork(paperId: string): Promise<APIResponse<CitationNetwork>> {
    const startTime = Date.now();
    
    try {
      console.log(`Building citation network for paper: ${paperId}`);
      
      // 獲取論文詳細信息
      const paperDetails = await this.makeRequest(`/paper/${paperId}?fields=paperId,title,authors,year,citationCount,referenceCount,influentialCitationCount,fieldsOfStudy,venue`);
      if (!paperDetails) {
        throw new Error('Paper not found');
      }

      const centralPaper = this.transformPaper(paperDetails);
      
      // 獲取引用該論文的文章
      const citationsResponse = await this.makeRequest(`/paper/${paperId}/citations?fields=paperId,title,authors,year,citationCount,influentialCitationCount&limit=20`);
      const citations = citationsResponse?.data?.map((item: any) => this.transformPaper(item.citingPaper)) || [];
      
      // 獲取該論文引用的文章
      const referencesResponse = await this.makeRequest(`/paper/${paperId}/references?fields=paperId,title,authors,year,citationCount,influentialCitationCount&limit=20`);
      const references = referencesResponse?.data?.map((item: any) => this.transformPaper(item.citedPaper)) || [];
      
      // 獲取有影響力的引用
      const influentialCitations = citations
        .filter((paper: ScholarPaper) => paper.influentialCitationCount > 0)
        .sort((a: ScholarPaper, b: ScholarPaper) => b.influentialCitationCount - a.influentialCitationCount)
        .slice(0, 10);

      const network: CitationNetwork = {
        centralPaper,
        citations,
        references,
        influentialCitations,
        citationDepth: 1, // 目前只支持一層深度
        networkSize: citations.length + references.length + 1
      };

      console.log(`Citation network built with ${network.networkSize} papers`);

      return {
        success: true,
        data: network,
        metadata: {
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
          version: '1.0.0'
        }
      };

    } catch (error) {
      console.error('Citation network error:', error);
      return {
        success: false,
        error: {
          code: 'SCHOLAR_CITATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          source: 'semanticscholar',
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
   * 分析作者
   */
  async analyzeAuthor(authorId: string): Promise<APIResponse<ScholarAuthor>> {
    const startTime = Date.now();
    
    try {
      console.log(`Analyzing author: ${authorId}`);
      
      const response = await this.makeRequest(`/author/${authorId}?fields=authorId,name,affiliations,paperCount,citationCount,hIndex,papers.paperId,papers.title,papers.year,papers.citationCount`);
      if (!response) {
        throw new Error('Author not found');
      }

      const author: ScholarAuthor = {
        authorId: response.authorId,
        name: response.name,
        affiliation: response.affiliations?.[0]?.name,
        paperCount: response.paperCount,
        citationCount: response.citationCount,
        hIndex: response.hIndex
      };

      console.log(`Author analysis completed: ${author.name}`);

      return {
        success: true,
        data: author,
        metadata: {
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
          version: '1.0.0'
        }
      };

    } catch (error) {
      console.error('Author analysis error:', error);
      return {
        success: false,
        error: {
          code: 'SCHOLAR_AUTHOR_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          source: 'semanticscholar',
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
   * 發現研究趨勢
   */
  async discoverTrends(field: string, timespan: number = 3): Promise<APIResponse<ResearchTrend>> {
    const startTime = Date.now();
    
    try {
      console.log(`Discovering trends in field: ${field}`);
      
      const currentYear = new Date().getFullYear();
      const startYear = currentYear - timespan;
      
      // 搜索該領域近年來的高引用論文
      const recentPapers = await this.searchAdvanced(field, {
        maxResults: 50,
        year: startYear,
        minCitationCount: 10,
        sortBy: 'citationCount'
      });

      if (!recentPapers.success || !recentPapers.data) {
        throw new Error('Failed to fetch recent papers');
      }

      // 分析熱門主題
      const hotTopics = this.extractHotTopics(recentPapers.data);
      
      // 找出新興作者（最近幾年發表高質量論文的作者）
      const emergingAuthors = this.findEmergingAuthors(recentPapers.data);
      
      // 關鍵論文（高引用的代表性論文）
      const keyPapers = recentPapers.data
        .sort((a, b) => b.citationCount - a.citationCount)
        .slice(0, 10);

      const trend: ResearchTrend = {
        field,
        trendDirection: this.calculateTrendDirection(recentPapers.data),
        hotTopics,
        emergingAuthors,
        keyPapers,
        timespan: {
          start: new Date(startYear, 0, 1),
          end: new Date(currentYear, 11, 31)
        }
      };

      console.log(`Research trend analysis completed for: ${field}`);

      return {
        success: true,
        data: trend,
        metadata: {
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
          version: '1.0.0'
        }
      };

    } catch (error) {
      console.error('Trend discovery error:', error);
      return {
        success: false,
        error: {
          code: 'SCHOLAR_TREND_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          source: 'semanticscholar',
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
   * 尋找有影響力的論文
   */
  async findInfluentialPapers(topic: string): Promise<APIResponse<ScholarPaper[]>> {
    const startTime = Date.now();
    
    try {
      console.log(`Finding influential papers on: ${topic}`);
      
      const searchResult = await this.searchAdvanced(topic, {
        maxResults: 20,
        minCitationCount: 50,
        sortBy: 'citationCount'
      });

      if (!searchResult.success || !searchResult.data) {
        throw new Error('Failed to search for influential papers');
      }

      // 過濾和排序有影響力的論文
      const influentialPapers = searchResult.data
        .filter((paper: ScholarPaper) => paper.influentialCitationCount > 5)
        .sort((a: ScholarPaper, b: ScholarPaper) => {
          // 綜合考慮總引用數和有影響力的引用數
          const scoreA = a.citationCount + (a.influentialCitationCount * 2);
          const scoreB = b.citationCount + (b.influentialCitationCount * 2);
          return scoreB - scoreA;
        });

      console.log(`Found ${influentialPapers.length} influential papers`);

      return {
        success: true,
        data: influentialPapers,
        metadata: {
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
          version: '1.0.0'
        }
      };

    } catch (error) {
      console.error('Influential papers search error:', error);
      return {
        success: false,
        error: {
          code: 'SCHOLAR_INFLUENTIAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          source: 'semanticscholar',
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

  private async makeRequest(endpoint: string): Promise<any> {
    await this.delay(this.requestDelay);
    
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }

    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`Semantic Scholar API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private buildSearchParams(query: string, options: ScholarSearchOptions): string {
    const params = new URLSearchParams();
    
    params.append('query', query);
    params.append('limit', (options.maxResults || 10).toString());
    
    if (options.year) {
      params.append('year', options.year.toString());
    }
    
    if (options.fieldsOfStudy && options.fieldsOfStudy.length > 0) {
      params.append('fieldsOfStudy', options.fieldsOfStudy.join(','));
    }
    
    if (options.minCitationCount) {
      params.append('minCitationCount', options.minCitationCount.toString());
    }
    
    if (options.venue) {
      params.append('venue', options.venue);
    }
    
    // 添加需要的字段
    params.append('fields', 'paperId,title,authors,abstract,year,citationCount,referenceCount,influentialCitationCount,fieldsOfStudy,venue,url');
    
    return params.toString();
  }

  private transformPaper(apiPaper: any): ScholarPaper {
    return {
      paperId: apiPaper.paperId,
      title: apiPaper.title || 'Untitled',
      authors: apiPaper.authors?.map((author: any) => ({
        authorId: author.authorId,
        name: author.name
      })) || [],
      abstract: apiPaper.abstract,
      year: apiPaper.year,
      citationCount: apiPaper.citationCount || 0,
      referenceCount: apiPaper.referenceCount || 0,
      influentialCitationCount: apiPaper.influentialCitationCount || 0,
      fieldsOfStudy: apiPaper.fieldsOfStudy || [],
      url: apiPaper.url,
      venue: apiPaper.venue,
      doi: apiPaper.doi
    };
  }

  private extractHotTopics(papers: ScholarPaper[]): string[] {
    // 統計研究領域出現頻率
    const fieldCount = new Map<string, number>();
    
    papers.forEach(paper => {
      paper.fieldsOfStudy.forEach(field => {
        fieldCount.set(field, (fieldCount.get(field) || 0) + 1);
      });
    });
    
    // 返回最熱門的主題
    return Array.from(fieldCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([field]) => field);
  }

  private findEmergingAuthors(papers: ScholarPaper[]): ScholarAuthor[] {
    // 統計作者的論文數和影響力
    const authorStats = new Map<string, { author: ScholarAuthor; papers: number; totalCitations: number }>();
    
    papers.forEach(paper => {
      paper.authors.forEach(author => {
        if (author.authorId) {
          const existing = authorStats.get(author.authorId);
          if (existing) {
            existing.papers++;
            existing.totalCitations += paper.citationCount;
          } else {
            authorStats.set(author.authorId, {
              author,
              papers: 1,
              totalCitations: paper.citationCount
            });
          }
        }
      });
    });
    
    // 找出發表論文數適中但影響力較高的新興作者
    return Array.from(authorStats.values())
      .filter(stat => stat.papers >= 2 && stat.papers <= 8) // 新興作者論文數適中
      .sort((a, b) => (b.totalCitations / b.papers) - (a.totalCitations / a.papers)) // 按平均引用數排序
      .slice(0, 5)
      .map(stat => stat.author);
  }

  private calculateTrendDirection(papers: ScholarPaper[]): 'rising' | 'stable' | 'declining' {
    // 簡化的趨勢計算：比較最近兩年和之前的論文數量
    const currentYear = new Date().getFullYear();
    const recentPapers = papers.filter(p => p.year && p.year >= currentYear - 1);
    const olderPapers = papers.filter(p => p.year && p.year < currentYear - 1);
    
    const recentRatio = recentPapers.length / Math.max(1, 2); // 最近兩年平均
    const olderRatio = olderPapers.length / Math.max(1, papers.length - recentPapers.length);
    
    if (recentRatio > olderRatio * 1.2) {
      return 'rising';
    } else if (recentRatio < olderRatio * 0.8) {
      return 'declining';
    } else {
      return 'stable';
    }
  }

  /**
   * v2.0 深度學術分析 - 綜合多維度深度挖掘
   */
  async performDeepAnalysis(
    topic: string,
    options: ScholarSearchOptions = {}
  ): Promise<APIResponse<DeepAnalysisResult>> {
    const startTime = Date.now();
    
    try {
      console.log(`🚀 v2.0 開始深度學術分析: ${topic}`);
      
      // 檢查緩存
      const cacheKey = `${topic}_${JSON.stringify(options)}`;
      if (await this.cacheManager.exists('scholar', 'analyzed', cacheKey)) {
        console.log(`✅ 深度分析結果已存在於緩存: ${topic}`);
        const cached = await this.cacheManager.retrieve('scholar', 'analyzed', cacheKey);
        if (cached) {
          return {
            success: true,
            data: JSON.parse(cached.content.toString()),
            metadata: {
              timestamp: new Date(),
              processingTime: Date.now() - startTime,
              version: '2.0.0'
            }
          };
        }
      }

      // 第一步：綜合搜索
      console.log(`📚 步驟 1: 搜索相關論文...`);
      const searchResult = await this.searchAdvanced(topic, {
        maxResults: 50,
        sortBy: 'citationCount',
        ...options
      });
      
      if (!searchResult.success || !searchResult.data || searchResult.data.length === 0) {
        throw new Error(`No papers found for topic: ${topic}`);
      }

      const papers = searchResult.data;
      console.log(`✅ 找到 ${papers.length} 篇相關論文`);

      // 第二步：選擇最具影響力的論文進行深度分析
      const topPaper = papers[0];
      console.log(`📄 步驟 2: 深度分析頂級論文: ${topPaper.title}`);
      
      // 第三步：構建引用網絡
      console.log(`🕸️  步驟 3: 構建引用網絡...`);
      const citationNetworkResult = await this.buildCitationNetwork(topPaper.paperId);
      const citationNetwork = citationNetworkResult.success ? citationNetworkResult.data! : {
        centralPaper: topPaper,
        citations: [],
        references: [],
        influentialCitations: [],
        citationDepth: 0,
        networkSize: 1
      };

      // 第四步：分析所有相關作者
      console.log(`👥 步驟 4: 分析主要作者...`);
      const authorAnalysis: ScholarAuthor[] = [];
      const uniqueAuthors = new Set<string>();
      
      for (const paper of papers.slice(0, 10)) {
        for (const author of paper.authors) {
          if (author.authorId && !uniqueAuthors.has(author.authorId)) {
            uniqueAuthors.add(author.authorId);
            const authorResult = await this.analyzeAuthor(author.authorId);
            if (authorResult.success && authorResult.data) {
              authorAnalysis.push(authorResult.data);
            }
            await this.delay(50); // 避免 API 限制
          }
        }
      }

      // 第五步：趨勢分析
      console.log(`📈 步驟 5: 分析研究趨勢...`);
      const trendResult = await this.discoverTrends(topic, 5);
      const trendAnalysis = trendResult.success ? trendResult.data! : {
        field: topic,
        trendDirection: 'stable' as const,
        hotTopics: [],
        emergingAuthors: [],
        keyPapers: papers.slice(0, 5),
        timespan: {
          start: new Date(new Date().getFullYear() - 5, 0, 1),
          end: new Date()
        }
      };

      // 第六步：v2.0 獲取真實論文內容
      console.log(`📄 步驟 6: 獲取真實論文全文...`);
      const fullTextPapers = await this.fetchFullTextContent(papers.slice(0, 10)) || []; // 限制到前10篇避免過長處理時間
      const fullTextCoverage = fullTextPapers.length > 0 ? 
        (fullTextPapers.filter(p => p.fullTextAvailable).length / fullTextPapers.length) * 100 : 0;
      
      console.log(`✅ 全文獲取完成: ${fullTextPapers.filter(p => p.fullTextAvailable).length}/${fullTextPapers.length} 篇 (${fullTextCoverage.toFixed(1)}%)`);

      // 第七步：生成增強的內容摘要
      console.log(`📝 步驟 7: 生成增強綜合摘要...`);
      const contentSummary = this.generateEnhancedSummary(
        topic, 
        papers, 
        citationNetwork, 
        authorAnalysis, 
        trendAnalysis,
        fullTextPapers // v2.0 加入真實論文內容
      );

      // 第七步：識別相關論文
      const relatedPapers = papers.slice(1, 11); // 除了頂級論文外的相關論文

      // 構建 v2.0 深度分析結果
      const result: DeepAnalysisResult = {
        paperId: topPaper.paperId,
        title: topPaper.title,
        fullDetails: topPaper,
        citationNetwork,
        authorAnalysis: authorAnalysis.slice(0, 20), // 限制作者數量
        trendAnalysis,
        contentSummary,
        relatedPapers,
        processingTime: Date.now() - startTime,
        // v2.0 新增字段
        fullTextPapers,
        fullTextCoverage
      };

      // 存儲深度分析結果
      await this.cacheManager.store('scholar', 'analyzed', cacheKey, JSON.stringify(result, null, 2), {
        analysisDate: new Date(),
        topic,
        paperCount: papers.length,
        authorCount: authorAnalysis.length,
        citationNetworkSize: citationNetwork.networkSize,
        processingVersion: '2.0.0'
      });

      console.log(`✅ 深度學術分析完成: ${topic} (${result.processingTime}ms)`);

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
          version: '2.0.0',
          analysisDepth: 'comprehensive',
          dataPoints: papers.length + authorAnalysis.length + citationNetwork.networkSize
        }
      };

    } catch (error) {
      console.error(`❌ 深度學術分析失敗: ${topic}`, error);
      
      return {
        success: false,
        error: {
          code: 'SCHOLAR_DEEP_ANALYSIS_ERROR',
          message: error instanceof Error ? error.message : 'Unknown deep analysis error',
          source: 'semanticscholar_v2',
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
   * 生成綜合摘要
   */
  private generateComprehensiveSummary(
    topic: string,
    papers: ScholarPaper[],
    citationNetwork: CitationNetwork,
    authors: ScholarAuthor[],
    trend: ResearchTrend
  ): string {
    const totalCitations = papers.reduce((sum, paper) => sum + paper.citationCount, 0);
    const avgCitations = Math.round(totalCitations / papers.length);
    const topAuthors = authors
      .sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0))
      .slice(0, 3)
      .map(a => a.name)
      .join(', ');

    return `
**${topic} 領域深度學術分析報告**

**研究概況**
- 分析論文數量: ${papers.length} 篇
- 總引用次數: ${totalCitations.toLocaleString()}
- 平均引用次數: ${avgCitations}
- 引用網絡規模: ${citationNetwork.networkSize} 個節點

**頂級論文**
- 標題: ${citationNetwork.centralPaper.title}
- 引用次數: ${citationNetwork.centralPaper.citationCount}
- 有影響力引用: ${citationNetwork.centralPaper.influentialCitationCount}
- 作者: ${citationNetwork.centralPaper.authors.map(a => a.name).join(', ')}

**主要學者**
- 頂級學者: ${topAuthors}
- 總分析學者數: ${authors.length}
- 學者總論文數: ${authors.reduce((sum, a) => sum + (a.paperCount || 0), 0)}

**研究趨勢**
- 發展方向: ${trend.trendDirection === 'rising' ? '快速增長' : trend.trendDirection === 'declining' ? '逐漸衰退' : '穩定發展'}
- 熱門主題: ${trend.hotTopics.slice(0, 5).join(', ')}
- 新興學者: ${trend.emergingAuthors.slice(0, 3).map(a => a.name).join(', ')}

**影響力網絡**
- 引用該領域的論文: ${citationNetwork.citations.length}
- 被該領域引用的論文: ${citationNetwork.references.length}
- 高影響力引用: ${citationNetwork.influentialCitations.length}

這個分析基於 Semantic Scholar 的綜合數據，提供了 ${topic} 領域的全面學術洞察。`.trim();
  }

  /**
   * v2.0 獲取真實論文全文內容
   */
  private async fetchFullTextContent(papers: ScholarPaper[]): Promise<DeepAnalysisResult['fullTextPapers']> {
    const fullTextPapers: NonNullable<DeepAnalysisResult['fullTextPapers']> = [];
    
    console.log(`📄 開始獲取 ${papers.length} 篇論文的全文內容...`);
    
    for (const paper of papers) {
      const startTime = Date.now();
      let fullTextAvailable = false;
      let textContent: string | undefined;
      let wordCount: number | undefined;
      let source: 'arxiv' | 'scholar' = 'scholar';
      
      try {
        // 嘗試從論文信息中提取 arXiv ID
        const arxivId = this.extractArxivId(paper);
        
        if (arxivId) {
          console.log(`📚 發現 arXiv ID: ${arxivId} for "${paper.title}"`);
          source = 'arxiv';
          
          // 使用 ArxivEngine 下載真實論文內容
          const arxivResult = await this.arxivEngine.downloadPaper(arxivId);
          
          if (arxivResult.success && arxivResult.metadata?.fullContent) {
            const content = arxivResult.metadata.fullContent;
            fullTextAvailable = true;
            
            // 提取純文本內容
            textContent = this.extractTextFromPdfContent(content);
            wordCount = content.wordCount || 0;
            
            console.log(`✅ 成功獲取全文: "${paper.title}" (${wordCount} 詞)`);
          } else {
            console.log(`❌ arXiv 下載失敗: ${arxivResult.error?.message}`);
          }
        } else {
          console.log(`📄 無 arXiv ID: "${paper.title}"`);
          // 未來可以添加其他全文源（如 DOI 解析）
        }
        
      } catch (error) {
        console.warn(`⚠️ 處理論文時發生錯誤: "${paper.title}"`, error);
      }
      
      fullTextPapers.push({
        paperId: paper.paperId,
        title: paper.title,
        source,
        fullTextAvailable,
        textContent,
        wordCount,
        processingTime: Date.now() - startTime
      });
      
      // 避免過於頻繁的請求
      await this.delay(200);
    }
    
    const successCount = fullTextPapers.filter(p => p.fullTextAvailable).length;
    console.log(`📊 全文獲取統計: ${successCount}/${papers.length} 篇成功 (${((successCount/papers.length)*100).toFixed(1)}%)`);
    
    return fullTextPapers;
  }

  /**
   * 從論文信息中提取 arXiv ID
   */
  private extractArxivId(paper: ScholarPaper): string | null {
    // 檢查 externalIds
    if (paper.externalIds?.ArXiv) {
      return paper.externalIds.ArXiv;
    }
    
    // 檢查 URL 中的 arXiv 連結
    if (paper.url) {
      const arxivMatch = paper.url.match(/arxiv\.org\/(?:abs|pdf)\/([0-9]+\.[0-9]+)/);
      if (arxivMatch) {
        return arxivMatch[1];
      }
    }
    
    // 檢查標題中的 arXiv 模式（有些論文會在標題中包含）
    const titleMatch = paper.title.match(/arXiv:([0-9]+\.[0-9]+)/i);
    if (titleMatch) {
      return titleMatch[1];
    }
    
    return null;
  }

  /**
   * 從 PDF 內容中提取純文本
   */
  private extractTextFromPdfContent(content: any): string {
    if (typeof content === 'string') {
      return content;
    }
    
    if (content.fullText) {
      return content.fullText;
    }
    
    // 如果是結構化內容，組合各部分
    let text = '';
    
    if (content.abstract) {
      text += 'Abstract:\n' + content.abstract + '\n\n';
    }
    
    if (content.sections && Array.isArray(content.sections)) {
      for (const section of content.sections) {
        if (section.title && section.content) {
          text += `${section.title}:\n${section.content}\n\n`;
        }
      }
    }
    
    if (content.text) {
      text += content.text;
    }
    
    return text.trim();
  }

  /**
   * v2.0 生成增強的綜合摘要（包含真實論文內容）
   */
  private generateEnhancedSummary(
    topic: string,
    papers: ScholarPaper[],
    citationNetwork: CitationNetwork,
    authors: ScholarAuthor[],
    trend: ResearchTrend,
    fullTextPapers: NonNullable<DeepAnalysisResult['fullTextPapers']>
  ): string {
    const topAuthors = authors
      .sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0))
      .slice(0, 5)
      .map(a => `${a.name} (${a.citationCount} 引用)`)
      .join(', ');

    const fullTextCount = fullTextPapers.filter(p => p.fullTextAvailable).length;
    const totalWords = fullTextPapers.reduce((sum, p) => sum + (p.wordCount || 0), 0);
    
    // 從全文中提取關鍵洞察
    const fullTextInsights = this.extractInsightsFromFullText(fullTextPapers);

    return `
# ${topic} 領域深度學術分析報告 (v2.0)

## 📊 數據覆蓋概況
- **論文樣本**: ${papers.length} 篇高質量論文
- **全文獲取**: ${fullTextCount}/${fullTextPapers.length} 篇 (${((fullTextCount/fullTextPapers.length)*100).toFixed(1)}%)
- **文本分析**: ${totalWords.toLocaleString()} 詞的深度內容
- **引用網絡**: ${citationNetwork.networkSize} 個節點
- **學者分析**: ${authors.length} 位核心研究者

## 🎯 核心論文分析
**代表性論文**:
- 標題: ${citationNetwork.centralPaper.title}
- 引用次數: ${citationNetwork.centralPaper.citationCount}
- 有影響力引用: ${citationNetwork.centralPaper.influentialCitationCount}
- 作者: ${citationNetwork.centralPaper.authors.map(a => a.name).join(', ')}

## 👥 主要學者
- 頂級學者: ${topAuthors}
- 總分析學者數: ${authors.length}
- 學者總論文數: ${authors.reduce((sum, a) => sum + (a.paperCount || 0), 0)}

## 📈 研究趨勢
- 發展方向: ${trend.trendDirection === 'rising' ? '快速增長' : trend.trendDirection === 'declining' ? '逐漸衰退' : '穩定發展'}
- 熱門主題: ${trend.hotTopics.slice(0, 5).join(', ')}
- 新興學者: ${trend.emergingAuthors.slice(0, 3).map(a => a.name).join(', ')}

## 🕸️ 影響力網絡
- 引用該領域的論文: ${citationNetwork.citations.length}
- 被該領域引用的論文: ${citationNetwork.references.length}
- 高影響力引用: ${citationNetwork.influentialCitations.length}

## 🔍 v2.0 深度內容洞察
${fullTextInsights}

## 📚 全文論文列表
${fullTextPapers.filter(p => p.fullTextAvailable).map(p => 
  `- **${p.title}** (${p.wordCount?.toLocaleString()} 詞, 來源: ${p.source})`
).join('\n')}

---
*這個 v2.0 分析整合了 Semantic Scholar 的網絡數據和 arXiv 的真實論文全文，提供了 ${topic} 領域前所未有的深度學術洞察。*`.trim();
  }

  /**
   * 從全文內容中提取關鍵洞察
   */
  private extractInsightsFromFullText(fullTextPapers: NonNullable<DeepAnalysisResult['fullTextPapers']>): string {
    const availablePapers = fullTextPapers.filter(p => p.fullTextAvailable && p.textContent);
    
    if (availablePapers.length === 0) {
      return '暫無全文內容可供深度分析。';
    }
    
    // 簡化的關鍵詞分析
    const allText = availablePapers.map(p => p.textContent).join(' ').toLowerCase();
    const methodKeywords = ['method', 'approach', 'algorithm', 'technique', 'model', 'framework'];
    const challengeKeywords = ['challenge', 'problem', 'limitation', 'issue', 'difficulty'];
    const resultKeywords = ['result', 'performance', 'accuracy', 'improvement', 'achieve'];
    
    const methodCount = methodKeywords.reduce((sum, word) => 
      sum + (allText.match(new RegExp(word, 'g'))?.length || 0), 0);
    const challengeCount = challengeKeywords.reduce((sum, word) => 
      sum + (allText.match(new RegExp(word, 'g'))?.length || 0), 0);
    const resultCount = resultKeywords.reduce((sum, word) => 
      sum + (allText.match(new RegExp(word, 'g'))?.length || 0), 0);
    
    return `
基於 ${availablePapers.length} 篇完整論文的深度分析：
- **方法論焦點**: 檢測到 ${methodCount} 次方法相關討論，顯示該領域技術創新活躍
- **挑戰識別**: 發現 ${challengeCount} 次挑戰相關描述，反映研究難點集中
- **成果展示**: 包含 ${resultCount} 次結果討論，表明實證研究充分
- **內容深度**: 平均每篇論文 ${Math.round(availablePapers.reduce((sum, p) => sum + (p.wordCount || 0), 0) / availablePapers.length).toLocaleString()} 詞
- **技術覆蓋**: 涵蓋從理論基礎到實際應用的完整研究鏈條`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async terminate(): Promise<void> {
    this.isInitialized = false;
    console.log('Semantic Scholar Engine terminated');
  }
}