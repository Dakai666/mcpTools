/**
 * 統一學術知識整合服務
 * 協調多個知識源引擎，提供統一的知識獲取接口
 */

import { ArxivEngine } from '../engines/ArxivEngine.js';
import { SemanticScholarEngine } from '../engines/SemanticScholarEngine.js';
import { WikipediaEngine } from '../engines/WikipediaEngine.js';

import {
  KnowledgeRequest,
  KnowledgeResponse,
  ProcessedContent,
  ContentSection,
  Recommendation,
  ResponseMetadata,
  SourceAttribution,
  KnowledgeDepth,
  ContentPurpose,
  KnowledgeSource,
  PodcastScript,
  ResearchReport,
  KnowledgeCard,
  APIResponse
} from '../types/index.js';

export class KnowledgeIntegrationService {
  private arxivEngine: ArxivEngine;
  private scholarEngine: SemanticScholarEngine;
  private wikiEngine: WikipediaEngine;
  private isInitialized = false;

  constructor(semanticScholarApiKey?: string) {
    this.arxivEngine = new ArxivEngine();
    this.scholarEngine = new SemanticScholarEngine(semanticScholarApiKey);
    this.wikiEngine = new WikipediaEngine();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('Initializing Knowledge Integration Service...');
    
    try {
      // 並行初始化所有引擎
      await Promise.allSettled([
        this.arxivEngine.initialize(),
        this.scholarEngine.initialize(),
        this.wikiEngine.initialize()
      ]);
      
      this.isInitialized = true;
      console.log('Knowledge Integration Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Knowledge Integration Service:', error);
      throw error;
    }
  }

  /**
   * 快速主題概覽 - 基於 Wikipedia
   */
  async quickKnowledgeOverview(topic: string): Promise<APIResponse<KnowledgeResponse>> {
    if (!this.isInitialized) await this.initialize();
    
    const startTime = Date.now();
    
    try {
      console.log(`Generating quick overview for: ${topic}`);
      
      const wikiResult = await this.wikiEngine.smartSearch(topic, 'basic');
      if (!wikiResult.success || !wikiResult.data) {
        throw new Error(`Failed to get Wikipedia content for: ${topic}`);
      }

      const content: ProcessedContent = {
        summary: wikiResult.data.summary,
        keyPoints: wikiResult.data.sections.slice(0, 5).map(s => s.title),
        detailedSections: this.transformWikiSections(wikiResult.data.sections),
        relatedTopics: wikiResult.data.relatedTopics,
        suggestedReading: this.generateWikiRecommendations(wikiResult.data)
      };

      const response: KnowledgeResponse = {
        topic,
        depth: 'basic',
        content,
        metadata: this.generateMetadata('basic', ['wikipedia']),
        sources: [{
          source: 'wikipedia',
          contribution: 100,
          quality: 8,
          recency: 1
        }],
        processingTime: Date.now() - startTime
      };

      return {
        success: true,
        data: response,
        metadata: {
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
          version: '1.0.0'
        }
      };

    } catch (error) {
      console.error('Quick overview error:', error);
      return this.createErrorResponse('QUICK_OVERVIEW_ERROR', error, startTime);
    }
  }

  /**
   * 深度研究搜索 - 整合 arXiv 和 Semantic Scholar
   */
  async deepResearchSearch(topic: string): Promise<APIResponse<KnowledgeResponse>> {
    if (!this.isInitialized) await this.initialize();
    
    const startTime = Date.now();
    
    try {
      console.log(`Conducting deep research search for: ${topic}`);
      
      // 並行搜索學術資源
      const [arxivResult, scholarResult] = await Promise.allSettled([
        this.arxivEngine.searchPapers(topic, { maxResults: 10 }),
        this.scholarEngine.searchAdvanced(topic, { maxResults: 10 })
      ]);

      let sections: ContentSection[] = [];
      let recommendations: Recommendation[] = [];
      let sources: SourceAttribution[] = [];

      // 處理 arXiv 結果
      if (arxivResult.status === 'fulfilled' && arxivResult.value.success && arxivResult.value.data) {
        const arxivSection = this.createArxivSection(arxivResult.value.data);
        sections.push(arxivSection);
        
        recommendations.push(...this.generateArxivRecommendations(arxivResult.value.data));
        sources.push({
          source: 'arxiv',
          contribution: 50,
          quality: 9,
          recency: 7
        });
      }

      // 處理 Semantic Scholar 結果
      if (scholarResult.status === 'fulfilled' && scholarResult.value.success && scholarResult.value.data) {
        const scholarSection = this.createScholarSection(scholarResult.value.data);
        sections.push(scholarSection);
        
        recommendations.push(...this.generateScholarRecommendations(scholarResult.value.data));
        sources.push({
          source: 'semanticscholar',
          contribution: 50,
          quality: 9,
          recency: 30
        });
      }

      if (sections.length === 0) {
        throw new Error('No academic content found for the topic');
      }

      const content: ProcessedContent = {
        summary: this.generateAcademicSummary(sections),
        keyPoints: this.extractAcademicKeyPoints(sections),
        detailedSections: sections,
        relatedTopics: this.extractRelatedTopicsFromAcademic(sections),
        suggestedReading: recommendations
      };

      const response: KnowledgeResponse = {
        topic,
        depth: 'academic',
        content,
        metadata: this.generateMetadata('academic', sources.map(s => s.source)),
        sources,
        processingTime: Date.now() - startTime
      };

      return {
        success: true,
        data: response,
        metadata: {
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
          version: '1.0.0'
        }
      };

    } catch (error) {
      console.error('Deep research search error:', error);
      return this.createErrorResponse('DEEP_RESEARCH_ERROR', error, startTime);
    }
  }

  /**
   * 多源知識摘要 - 整合所有來源
   */
  async multiSourceSummary(request: KnowledgeRequest): Promise<APIResponse<KnowledgeResponse>> {
    if (!this.isInitialized) await this.initialize();
    
    const startTime = Date.now();
    
    try {
      console.log(`Generating multi-source summary for: ${request.topic}`);
      
      const sources = request.sources || ['wikipedia', 'arxiv', 'semanticscholar'];
      const results: ContentSection[] = [];
      const attributions: SourceAttribution[] = [];
      const allRecommendations: Recommendation[] = [];

      // 根據時間限制調整搜索策略
      const searchLimits = this.calculateSearchLimits(request.timeLimit, sources.length);

      // 並行獲取各個來源的內容
      const promises = sources.map(source => this.getContentFromSource(request.topic, source, request.depth, searchLimits));
      const sourceResults = await Promise.allSettled(promises);

      for (let i = 0; i < sourceResults.length; i++) {
        const result = sourceResults[i];
        const source = sources[i];
        
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value.section);
          attributions.push(result.value.attribution);
          allRecommendations.push(...result.value.recommendations);
        } else {
          console.warn(`Failed to get content from ${source}:`, result.status === 'rejected' ? result.reason : 'Unknown error');
        }
      }

      if (results.length === 0) {
        throw new Error('No content could be retrieved from any source');
      }

      // 智能融合內容
      const fusedContent = this.fuseMultiSourceContent(results, request.format);

      const response: KnowledgeResponse = {
        topic: request.topic,
        depth: request.depth,
        content: fusedContent,
        metadata: this.generateMetadata(request.depth, sources),
        sources: attributions,
        processingTime: Date.now() - startTime
      };

      return {
        success: true,
        data: response,
        metadata: {
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
          version: '1.0.0'
        }
      };

    } catch (error) {
      console.error('Multi-source summary error:', error);
      return this.createErrorResponse('MULTI_SOURCE_ERROR', error, startTime);
    }
  }

  /**
   * 生成 Podcast 腳本
   */
  async generatePodcastScript(topic: string, duration: number = 20): Promise<APIResponse<PodcastScript>> {
    if (!this.isInitialized) await this.initialize();
    
    const startTime = Date.now();
    
    try {
      console.log(`Generating podcast script for: ${topic} (${duration} minutes)`);
      
      // 獲取適合 Podcast 的內容
      const wikiResult = await this.wikiEngine.generateContextualSummary(topic, 'podcast');
      if (!wikiResult.success || !wikiResult.data) {
        throw new Error('Failed to get podcast-suitable content');
      }

      const script: PodcastScript = {
        title: `深度探討：${topic}`,
        duration,
        segments: this.createPodcastSegments(wikiResult.data, duration),
        transitions: this.generatePodcastTransitions(),
        callToActions: this.generateCallToActions(topic),
        metadata: {
          targetAudience: '對知識感興趣的聽眾',
          difficulty: 'professional',
          topics: [topic],
          keywords: wikiResult.data.keyPoints,
          suggestedMusic: '輕鬆的背景音樂'
        }
      };

      return {
        success: true,
        data: script,
        metadata: {
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
          version: '1.0.0'
        }
      };

    } catch (error) {
      console.error('Podcast script generation error:', error);
      return {
        success: false,
        error: {
          code: 'PODCAST_SCRIPT_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          source: 'hybrid',
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
   * 創建研究報告
   */
  async createResearchReport(topic: string): Promise<APIResponse<ResearchReport>> {
    if (!this.isInitialized) await this.initialize();
    
    const startTime = Date.now();
    
    try {
      console.log(`Creating research report for: ${topic}`);
      
      // 獲取深度學術內容
      const researchResult = await this.deepResearchSearch(topic);
      if (!researchResult.success || !researchResult.data) {
        throw new Error('Failed to gather research content');
      }

      const knowledge = researchResult.data;
      
      const report: ResearchReport = {
        title: `${topic} - 研究報告`,
        abstract: knowledge.content.summary,
        sections: this.createReportSections(knowledge.content),
        bibliography: this.extractCitations(knowledge.content),
        appendices: [],
        metadata: {
          authors: ['AI Knowledge Integration System'],
          date: new Date(),
          version: '1.0',
          wordCount: this.calculateWordCount(knowledge.content),
          pageCount: Math.ceil(this.calculateWordCount(knowledge.content) / 500)
        }
      };

      return {
        success: true,
        data: report,
        metadata: {
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
          version: '1.0.0'
        }
      };

    } catch (error) {
      console.error('Research report creation error:', error);
      return {
        success: false,
        error: {
          code: 'RESEARCH_REPORT_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          source: 'hybrid',
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
   * 格式化知識卡片
   */
  async formatKnowledgeCards(topic: string): Promise<APIResponse<KnowledgeCard[]>> {
    if (!this.isInitialized) await this.initialize();
    
    const startTime = Date.now();
    
    try {
      console.log(`Creating knowledge cards for: ${topic}`);
      
      // 獲取基礎內容
      const overview = await this.quickKnowledgeOverview(topic);
      if (!overview.success || !overview.data) {
        throw new Error('Failed to get overview content');
      }

      const knowledge = overview.data;
      const cards: KnowledgeCard[] = [];

      // 主要概念卡片
      cards.push({
        id: `${topic}-main`,
        topic: topic,
        category: 'main-concept',
        summary: knowledge.content.summary,
        keyPoints: knowledge.content.keyPoints,
        difficulty: knowledge.depth,
        estimatedReadingTime: 5,
        tags: ['概念', '基礎'],
        relatedCards: [],
        sources: knowledge.sources.map(s => s.source),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // 為每個重要章節創建卡片
      knowledge.content.detailedSections.slice(0, 5).forEach((section, index) => {
        cards.push({
          id: `${topic}-section-${index}`,
          topic: section.title,
          category: 'section',
          summary: section.content.slice(0, 200) + '...',
          keyPoints: [section.title],
          difficulty: knowledge.depth,
          estimatedReadingTime: 3,
          tags: ['詳細', section.title],
          relatedCards: [`${topic}-main`],
          sources: [section.source],
          createdAt: new Date(),
          updatedAt: new Date()
        });
      });

      // 設置相關卡片關聯
      if (cards.length > 1) {
        cards[0].relatedCards = cards.slice(1).map(c => c.id);
      }

      return {
        success: true,
        data: cards,
        metadata: {
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
          version: '1.0.0'
        }
      };

    } catch (error) {
      console.error('Knowledge cards creation error:', error);
      return {
        success: false,
        error: {
          code: 'KNOWLEDGE_CARDS_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          source: 'hybrid',
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

  private async getContentFromSource(
    topic: string, 
    source: KnowledgeSource, 
    depth: KnowledgeDepth, 
    limit: number
  ): Promise<{ section: ContentSection; attribution: SourceAttribution; recommendations: Recommendation[] } | null> {
    
    try {
      switch (source) {
        case 'wikipedia':
          const wikiResult = await this.wikiEngine.smartSearch(topic, depth);
          if (!wikiResult.success || !wikiResult.data) return null;
          
          return {
            section: {
              title: '百科全書知識',
              content: wikiResult.data.summary,
              importance: 8,
              source: 'wikipedia',
              citations: []
            },
            attribution: {
              source: 'wikipedia',
              contribution: 33,
              quality: 8,
              recency: 1
            },
            recommendations: this.generateWikiRecommendations(wikiResult.data)
          };

        case 'arxiv':
          const arxivResult = await this.arxivEngine.searchPapers(topic, { maxResults: limit });
          if (!arxivResult.success || !arxivResult.data) return null;
          
          return {
            section: this.createArxivSection(arxivResult.data),
            attribution: {
              source: 'arxiv',
              contribution: 33,
              quality: 9,
              recency: 7
            },
            recommendations: this.generateArxivRecommendations(arxivResult.data)
          };

        case 'semanticscholar':
          const scholarResult = await this.scholarEngine.searchAdvanced(topic, { maxResults: limit });
          if (!scholarResult.success || !scholarResult.data) return null;
          
          return {
            section: this.createScholarSection(scholarResult.data),
            attribution: {
              source: 'semanticscholar',
              contribution: 33,
              quality: 9,
              recency: 30
            },
            recommendations: this.generateScholarRecommendations(scholarResult.data)
          };

        default:
          return null;
      }
    } catch (error) {
      console.warn(`Error getting content from ${source}:`, error);
      return null;
    }
  }

  private calculateSearchLimits(timeLimit: number, sourceCount: number): number {
    // 根據時間限制計算每個來源的搜索結果數量
    if (timeLimit <= 10) return 3;
    if (timeLimit <= 30) return 5;
    if (timeLimit <= 60) return 8;
    return 10;
  }

  private fuseMultiSourceContent(sections: ContentSection[], format: string): ProcessedContent {
    const summary = sections.map(s => s.content).join('\n\n');
    const keyPoints = sections.flatMap(s => [s.title]);
    const relatedTopics = [...new Set(sections.flatMap(s => s.citations.map(c => c.title)))];
    
    return {
      summary: summary.slice(0, 1000) + (summary.length > 1000 ? '...' : ''),
      keyPoints,
      detailedSections: sections,
      relatedTopics: relatedTopics.slice(0, 10),
      suggestedReading: []
    };
  }

  private transformWikiSections(sections: any[]): ContentSection[] {
    return sections.slice(0, 5).map(section => ({
      title: section.title,
      content: section.content,
      importance: Math.floor(Math.random() * 5) + 6,
      source: 'wikipedia' as const,
      citations: []
    }));
  }

  private createArxivSection(papers: any[]): ContentSection {
    const content = papers.slice(0, 3).map(paper => 
      `**${paper.title}** (${paper.publishedDate.getFullYear()})\n${paper.abstract.slice(0, 200)}...`
    ).join('\n\n');

    return {
      title: '前沿學術研究 (arXiv)',
      content,
      importance: 9,
      source: 'arxiv',
      citations: papers.map(paper => paper.citation)
    };
  }

  private createScholarSection(papers: any[]): ContentSection {
    const content = papers.slice(0, 3).map(paper => 
      `**${paper.title}** (${paper.year || 'N/A'})\n引用數: ${paper.citationCount}\n${paper.abstract?.slice(0, 200) || '摘要不可用'}...`
    ).join('\n\n');

    return {
      title: '學術文獻綜述 (Semantic Scholar)',
      content,
      importance: 9,
      source: 'semanticscholar',
      citations: papers.map(paper => ({
        title: paper.title,
        authors: paper.authors.map((a: any) => a.name),
        year: paper.year || 0,
        source: 'Semantic Scholar',
        url: paper.url
      }))
    };
  }

  private generateMetadata(depth: KnowledgeDepth, sources: KnowledgeSource[]): ResponseMetadata {
    return {
      generatedAt: new Date(),
      version: '1.0.0',
      confidence: sources.length > 1 ? 90 : 80,
      completeness: depth === 'academic' ? 95 : (depth === 'professional' ? 85 : 75),
      sourcesUsed: sources,
      estimatedReadingTime: depth === 'academic' ? 20 : (depth === 'professional' ? 10 : 5)
    };
  }

  private generateWikiRecommendations(content: any): Recommendation[] {
    return [{
      title: `Wikipedia: ${content.title}`,
      type: 'webpage',
      url: `https://zh.wikipedia.org/wiki/${encodeURIComponent(content.title)}`,
      relevance: 9,
      difficulty: 'basic'
    }];
  }

  private generateArxivRecommendations(papers: any[]): Recommendation[] {
    return papers.slice(0, 3).map(paper => ({
      title: paper.title,
      type: 'paper' as const,
      url: paper.pdfUrl,
      relevance: 9,
      difficulty: 'academic' as const
    }));
  }

  private generateScholarRecommendations(papers: any[]): Recommendation[] {
    return papers.slice(0, 3).map(paper => ({
      title: paper.title,
      type: 'paper' as const,
      url: paper.url,
      relevance: 8,
      difficulty: 'academic' as const
    }));
  }

  private generateAcademicSummary(sections: ContentSection[]): string {
    return `基於 ${sections.length} 個學術來源的綜合分析：\n\n` + 
           sections.map(s => s.content.slice(0, 150) + '...').join('\n\n');
  }

  private extractAcademicKeyPoints(sections: ContentSection[]): string[] {
    return sections.map(s => s.title);
  }

  private extractRelatedTopicsFromAcademic(sections: ContentSection[]): string[] {
    return sections.flatMap(s => s.citations.map(c => c.title)).slice(0, 10);
  }

  private createPodcastSegments(content: any, duration: number): any[] {
    const segmentDuration = duration / 4;
    return [
      {
        type: 'intro',
        duration: segmentDuration * 0.5,
        script: `歡迎收聽知識探索節目。今天我們要深入了解 ${content.topic}...`,
        speakingNotes: ['熱情開場', '介紹主題'],
        sources: ['introduction']
      },
      {
        type: 'main',
        duration: segmentDuration * 2,
        script: content.summary,
        speakingNotes: content.keyPoints,
        sources: ['main-content']
      },
      {
        type: 'summary',
        duration: segmentDuration * 0.5,
        script: '總結今天的重點內容...',
        speakingNotes: ['重點回顧', '思考總結'],
        sources: ['conclusion']
      }
    ];
  }

  private generatePodcastTransitions(): string[] {
    return [
      '讓我們深入了解...',
      '這讓我想到...',
      '另一個有趣的觀點是...',
      '總結來說...'
    ];
  }

  private generateCallToActions(topic: string): string[] {
    return [
      `如果你對 ${topic} 有更多想法，歡迎留言討論`,
      '別忘了訂閱我們的節目獲取更多知識內容',
      '下期節目我們將探討相關的其他主題'
    ];
  }

  private createReportSections(content: ProcessedContent): any[] {
    return [
      {
        heading: '1. 概述',
        level: 1,
        content: content.summary,
        subsections: [],
        figures: [],
        tables: []
      },
      {
        heading: '2. 詳細分析',
        level: 1,
        content: content.detailedSections.map(s => s.content).join('\n\n'),
        subsections: content.detailedSections.map(s => ({
          heading: s.title,
          level: 2,
          content: s.content,
          subsections: [],
          figures: [],
          tables: []
        })),
        figures: [],
        tables: []
      },
      {
        heading: '3. 結論',
        level: 1,
        content: '基於以上分析，我們可以得出以下結論...',
        subsections: [],
        figures: [],
        tables: []
      }
    ];
  }

  private extractCitations(content: ProcessedContent): any[] {
    return content.detailedSections.flatMap(s => s.citations);
  }

  private calculateWordCount(content: ProcessedContent): number {
    const text = content.summary + ' ' + content.detailedSections.map(s => s.content).join(' ');
    return text.split(/\s+/).length;
  }

  private createErrorResponse(code: string, error: any, startTime: number): APIResponse<KnowledgeResponse> {
    return {
      success: false,
      error: {
        code,
        message: error instanceof Error ? error.message : 'Unknown error',
        source: 'hybrid',
        retryable: true
      },
      metadata: {
        timestamp: new Date(),
        processingTime: Date.now() - startTime,
        version: '1.0.0'
      }
    };
  }

  async terminate(): Promise<void> {
    console.log('Terminating Knowledge Integration Service...');
    
    await Promise.allSettled([
      this.arxivEngine.terminate(),
      this.scholarEngine.terminate(),
      this.wikiEngine.terminate()
    ]);
    
    this.isInitialized = false;
    console.log('Knowledge Integration Service terminated');
  }
}