/**
 * 文本深化處理服務 - 階段三核心功能
 * 實現智能文本處理管道：章節分割、關鍵詞提取、概念圖構建、摘要生成
 */

import { CacheManager } from './CacheManager.js';

export interface ProcessedContent {
  originalText: string;
  sections: ContentSection[];
  keywords: ExtractedKeyword[];
  conceptMap: ConceptNode[];
  summaries: LayeredSummary;
  metadata: ProcessingMetadata;
}

export interface ContentSection {
  id: string;
  level: number;
  title: string;
  content: string;
  wordCount: number;
  type: 'introduction' | 'methodology' | 'results' | 'discussion' | 'conclusion' | 'reference' | 'other';
  confidence: number;
  startPosition: number;
  endPosition: number;
}

export interface ExtractedKeyword {
  term: string;
  frequency: number;
  tfIdfScore: number;
  semanticWeight: number;
  category: 'concept' | 'method' | 'entity' | 'technique' | 'domain';
  context: string[];
  relevanceScore: number;
}

export interface ConceptNode {
  id: string;
  name: string;
  type: 'person' | 'organization' | 'concept' | 'method' | 'technology' | 'location';
  importance: number;
  connections: ConceptConnection[];
  mentions: TextMention[];
  definition?: string;
}

export interface ConceptConnection {
  targetId: string;
  relationshipType: 'causes' | 'enables' | 'contradicts' | 'supports' | 'influences' | 'related';
  strength: number;
  evidence: string[];
}

export interface TextMention {
  sectionId: string;
  position: number;
  context: string;
  confidence: number;
}

export interface LayeredSummary {
  basic: {
    content: string;
    keyPoints: string[];
    readingTime: number; // 分鐘
  };
  professional: {
    content: string;
    keyPoints: string[];
    technicalTerms: string[];
    readingTime: number;
  };
  academic: {
    content: string;
    keyPoints: string[];
    methodology: string;
    findings: string[];
    limitations: string[];
    readingTime: number;
  };
}

export interface ProcessingMetadata {
  processingTime: number;
  version: string;
  confidence: number;
  algorithmVersions: {
    segmentation: string;
    keywordExtraction: string;
    conceptMapping: string;
    summarization: string;
  };
  statistics: {
    totalWords: number;
    totalSections: number;
    totalKeywords: number;
    totalConcepts: number;
  };
}

export class TextProcessingService {
  private cacheManager: CacheManager;
  private isInitialized = false;

  constructor() {
    this.cacheManager = new CacheManager();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🧠 Initializing Text Processing Service v1.0...');
    
    try {
      this.isInitialized = true;
      console.log('✅ Text Processing Service initialized successfully');
      console.log('   📄 章節分割器已就緒');
      console.log('   🔍 關鍵詞提取器已就緒');
      console.log('   🗺️  概念圖構建器已就緒');
      console.log('   📝 摘要生成器已就緒');
    } catch (error) {
      console.error('Failed to initialize Text Processing Service:', error);
      throw error;
    }
  }

  /**
   * 深度文本處理 - 主要入口點
   */
  async processText(text: string, source: string = 'unknown'): Promise<{
    success: boolean;
    data?: ProcessedContent;
    error?: any;
    metadata: any;
  }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    
    try {
      console.log(`🧠 開始深度文本處理 (${text.length} 字符)`);

      // 步驟 1: 章節分割
      console.log('📄 執行章節分割...');
      const sections = await this.segmentContent(text);
      
      // 步驟 2: 關鍵詞提取
      console.log('🔍 執行關鍵詞提取...');
      const keywords = await this.extractKeywords(text, sections);
      
      // 步驟 3: 概念圖構建
      console.log('🗺️  執行概念圖構建...');
      const conceptMap = await this.buildConceptMap(text, sections, keywords);
      
      // 步驟 4: 多層摘要生成
      console.log('📝 執行多層摘要生成...');
      const summaries = await this.generateLayeredSummaries(text, sections, keywords);

      // 組裝結果
      const processedContent: ProcessedContent = {
        originalText: text,
        sections,
        keywords,
        conceptMap,
        summaries,
        metadata: {
          processingTime: Date.now() - startTime,
          version: '1.0.0',
          confidence: this.calculateOverallConfidence(sections, keywords, conceptMap),
          algorithmVersions: {
            segmentation: '1.0',
            keywordExtraction: '1.0',
            conceptMapping: '1.0',
            summarization: '1.0'
          },
          statistics: {
            totalWords: text.split(/\s+/).length,
            totalSections: sections.length,
            totalKeywords: keywords.length,
            totalConcepts: conceptMap.length
          }
        }
      };

      // 緩存結果 (暫時註釋，避免類型衝突)
      // await this.cacheManager.store('text-processing', 'processed', `${source}-processed`, processedContent);

      console.log(`✅ 文本處理完成:`);
      console.log(`   📊 章節數: ${sections.length}`);
      console.log(`   🔤 關鍵詞: ${keywords.length}`);
      console.log(`   🧩 概念節點: ${conceptMap.length}`);
      console.log(`   ⏱️  處理時間: ${Date.now() - startTime}ms`);

      return {
        success: true,
        data: processedContent,
        metadata: {
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
          version: '1.0.0'
        }
      };

    } catch (error) {
      console.error('文本處理失敗:', error);
      return {
        success: false,
        error: {
          code: 'TEXT_PROCESSING_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          source: 'text-processing',
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
   * 1. 智能章節分割器
   */
  private async segmentContent(text: string): Promise<ContentSection[]> {
    const sections: ContentSection[] = [];
    
    // 基本的章節識別模式
    const sectionPatterns = [
      { pattern: /^(摘要|abstract|概述|概要)[\s]*$/im, type: 'introduction' as const },
      { pattern: /^(引言|前言|介紹|introduction|背景)[\s]*$/im, type: 'introduction' as const },
      { pattern: /^(方法|方法論|methodology|methods|實驗方法)[\s]*$/im, type: 'methodology' as const },
      { pattern: /^(結果|實驗結果|results|findings)[\s]*$/im, type: 'results' as const },
      { pattern: /^(討論|分析|discussion|analysis)[\s]*$/im, type: 'discussion' as const },
      { pattern: /^(結論|總結|conclusion|conclusions)[\s]*$/im, type: 'conclusion' as const },
      { pattern: /^(參考文獻|references|bibliography)[\s]*$/im, type: 'reference' as const }
    ];

    // 分割文本為段落
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
    let currentPosition = 0;
    let currentSection: ContentSection | null = null;
    let sectionId = 0;

    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();
      
      // 檢查是否為新章節開始
      let isNewSection = false;
      let sectionType: ContentSection['type'] = 'other';
      
      // 檢查章節標題模式
      for (const { pattern, type } of sectionPatterns) {
        if (pattern.test(trimmedParagraph)) {
          isNewSection = true;
          sectionType = type;
          break;
        }
      }

      // 檢查數字編號章節 (1. 2. 一、二、等)
      if (!isNewSection && /^[\d一二三四五六七八九十]+[、．.]\s/.test(trimmedParagraph)) {
        isNewSection = true;
        sectionType = 'other';
      }

      // 檢查標題級別 (##, ###等 或者全大寫短行)
      if (!isNewSection && (
        /^#{1,6}\s/.test(trimmedParagraph) ||
        (trimmedParagraph.length < 50 && trimmedParagraph === trimmedParagraph.toUpperCase() && /[A-Z]/.test(trimmedParagraph))
      )) {
        isNewSection = true;
        sectionType = 'other';
      }

      if (isNewSection) {
        // 完成前一個章節
        if (currentSection) {
          currentSection.endPosition = currentPosition;
          currentSection.wordCount = currentSection.content.split(/\s+/).length;
          sections.push(currentSection);
        }

        // 開始新章節
        currentSection = {
          id: `section-${++sectionId}`,
          level: this.detectHeaderLevel(trimmedParagraph),
          title: this.extractTitle(trimmedParagraph),
          content: trimmedParagraph,
          type: sectionType,
          confidence: 0.8, // 將在後面計算
          startPosition: currentPosition,
          endPosition: 0,
          wordCount: 0
        };
      } else if (currentSection) {
        // 添加到當前章節
        currentSection.content += '\n\n' + trimmedParagraph;
      } else {
        // 創建初始章節
        currentSection = {
          id: `section-${++sectionId}`,
          level: 1,
          title: '內容',
          content: trimmedParagraph,
          type: 'other',
          confidence: 0.6,
          startPosition: currentPosition,
          endPosition: 0,
          wordCount: 0
        };
      }

      currentPosition += paragraph.length + 2; // +2 for \n\n
    }

    // 完成最後一個章節
    if (currentSection) {
      currentSection.endPosition = currentPosition;
      currentSection.wordCount = currentSection.content.split(/\s+/).length;
      sections.push(currentSection);
    }

    // 改善信心度計算
    this.improveConfidenceScores(sections);

    return sections;
  }

  private detectHeaderLevel(text: string): number {
    // 檢測標題級別
    const hashMatch = text.match(/^(#{1,6})\s/);
    if (hashMatch) {
      return hashMatch[1].length;
    }

    // 數字編號推斷級別
    if (/^\d+\.\s/.test(text)) return 1;
    if (/^\d+\.\d+\s/.test(text)) return 2;
    if (/^\d+\.\d+\.\d+\s/.test(text)) return 3;

    // 中文編號
    if (/^[一二三四五六七八九十]+[、．]\s/.test(text)) return 1;
    if (/^[(（][一二三四五六七八九十]+[)）]\s/.test(text)) return 2;

    return 1; // 預設為一級標題
  }

  private extractTitle(text: string): string {
    // 移除標記並提取標題
    return text
      .replace(/^#{1,6}\s*/, '')  // 移除 markdown 標記
      .replace(/^\d+[\.\)]\s*/, '') // 移除數字編號
      .replace(/^[一二三四五六七八九十]+[、．]\s*/, '') // 移除中文編號
      .replace(/^[(（][^)）]+[)）]\s*/, '') // 移除括號編號
      .trim()
      .split('\n')[0] // 只取第一行作為標題
      .substring(0, 100); // 限制長度
  }

  private improveConfidenceScores(sections: ContentSection[]): void {
    sections.forEach(section => {
      let confidence = 0.5; // 基礎信心度

      // 章節類型識別準確性
      if (section.type !== 'other') confidence += 0.2;

      // 標題品質
      if (section.title.length > 3 && section.title.length < 50) confidence += 0.1;

      // 內容長度合理性
      if (section.wordCount > 10 && section.wordCount < 2000) confidence += 0.1;

      // 結構完整性
      if (section.content.includes('\n')) confidence += 0.1;

      section.confidence = Math.min(confidence, 1.0);
    });
  }

  /**
   * 2. 關鍵詞提取器 (TF-IDF + 語義分析)
   */
  private async extractKeywords(text: string, sections: ContentSection[]): Promise<ExtractedKeyword[]> {
    const keywords: ExtractedKeyword[] = [];
    
    // 準備文本語料
    const documents = [text, ...sections.map(s => s.content)];
    
    // 計算詞頻 (TF)
    const termFrequency = this.calculateTermFrequency(text);
    
    // 計算文檔頻率 (DF) 和 IDF
    const documentFrequency = this.calculateDocumentFrequency(documents);
    const totalDocuments = documents.length;
    
    // 停用詞列表
    const stopWords = new Set([
      '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一個', '上', '也', '很', '到', '說', '要', '去', '你', '會', '著', '沒有', '看', '好', '自己', '這',
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once'
    ]);

    // 學術術語模式
    const technicalPatterns = [
      /[A-Z][a-z]+(?:[A-Z][a-z]+)+/, // CamelCase
      /[a-zA-Z]+-[a-zA-Z]+/, // 連字符術語
      /\b[A-Z]{2,}\b/, // 縮寫
      /\b\w+(?:ing|tion|sion|ness|ment|ity|ogy|ism)\b/i // 學術詞綴
    ];

    for (const [term, frequency] of termFrequency.entries()) {
      if (stopWords.has(term.toLowerCase()) || term.length < 3) continue;

      const df = documentFrequency.get(term) || 1;
      const idf = Math.log(totalDocuments / df);
      const tfIdfScore = frequency * idf;

      // 計算語義權重
      let semanticWeight = 0;
      
      // 技術術語加權
      if (technicalPatterns.some(pattern => pattern.test(term))) {
        semanticWeight += 0.3;
      }

      // 首字母大寫加權 (專有名詞)
      if (/^[A-Z]/.test(term)) {
        semanticWeight += 0.2;
      }

      // 長度加權 (較長的詞通常更重要)
      if (term.length > 6) {
        semanticWeight += 0.1;
      }

      // 分類術語
      const category = this.categorizeKeyword(term);

      // 提取上下文
      const context = this.extractContext(text, term);

      // 計算相關性分數
      const relevanceScore = this.calculateRelevanceScore(tfIdfScore, semanticWeight, category, context);

      if (relevanceScore > 0.1) { // 設定閾值
        keywords.push({
          term,
          frequency,
          tfIdfScore,
          semanticWeight,
          category,
          context,
          relevanceScore
        });
      }
    }

    // 按相關性排序並限制數量
    return keywords
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 50); // 限制前50個關鍵詞
  }

  private calculateTermFrequency(text: string): Map<string, number> {
    const termFreq = new Map<string, number>();
    
    // 標準化文本並分詞
    const words = text
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fff]/g, ' ') // 保留中文字符
      .split(/\s+/)
      .filter(word => word.length > 0);

    words.forEach(word => {
      termFreq.set(word, (termFreq.get(word) || 0) + 1);
    });

    return termFreq;
  }

  private calculateDocumentFrequency(documents: string[]): Map<string, number> {
    const docFreq = new Map<string, number>();

    documents.forEach(doc => {
      const uniqueTerms = new Set(
        doc.toLowerCase()
          .replace(/[^\w\s\u4e00-\u9fff]/g, ' ')
          .split(/\s+/)
          .filter(word => word.length > 0)
      );

      uniqueTerms.forEach(term => {
        docFreq.set(term, (docFreq.get(term) || 0) + 1);
      });
    });

    return docFreq;
  }

  private categorizeKeyword(term: string): ExtractedKeyword['category'] {
    // 概念詞
    if (/^(概念|理論|原理|模型|假設|框架)/.test(term)) return 'concept';
    
    // 方法詞
    if (/^(方法|算法|技術|技巧|流程|步驟|程序)/.test(term)) return 'method';
    
    // 實體詞 (專有名詞)
    if (/^[A-Z]/.test(term)) return 'entity';
    
    // 技術詞
    if (/(ing|tion|sion|ness|ment|ity|ogy|ism)$/.test(term)) return 'technique';
    
    return 'domain';
  }

  private extractContext(text: string, term: string): string[] {
    const contexts: string[] = [];
    const regex = new RegExp(`(.{0,50})\\b${term}\\b(.{0,50})`, 'gi');
    let match;

    while ((match = regex.exec(text)) !== null && contexts.length < 3) {
      const context = match[0].trim();
      if (context.length > term.length + 10) {
        contexts.push(context);
      }
    }

    return contexts;
  }

  private calculateRelevanceScore(
    tfIdfScore: number, 
    semanticWeight: number, 
    category: ExtractedKeyword['category'],
    context: string[]
  ): number {
    let score = tfIdfScore * 0.7 + semanticWeight * 0.3;
    
    // 類別權重
    const categoryWeights = {
      'concept': 1.2,
      'method': 1.1,
      'technique': 1.0,
      'entity': 0.9,
      'domain': 0.8
    };
    
    score *= categoryWeights[category];
    
    // 上下文豐富度加權
    score *= (1 + context.length * 0.1);
    
    return score;
  }

  /**
   * 3. 概念圖構建器
   */
  private async buildConceptMap(
    text: string, 
    sections: ContentSection[], 
    keywords: ExtractedKeyword[]
  ): Promise<ConceptNode[]> {
    const concepts: ConceptNode[] = [];
    const conceptId = (name: string) => `concept-${name.toLowerCase().replace(/\s+/g, '-')}`;

    // 從關鍵詞創建概念節點
    for (const keyword of keywords.slice(0, 20)) { // 限制前20個最重要的關鍵詞
      const concept: ConceptNode = {
        id: conceptId(keyword.term),
        name: keyword.term,
        type: this.mapCategoryToType(keyword.category),
        importance: keyword.relevanceScore,
        connections: [],
        mentions: this.findMentions(keyword.term, sections),
        definition: this.extractDefinition(keyword.term, text)
      };

      concepts.push(concept);
    }

    // 建立概念之間的連接
    this.buildConceptConnections(concepts, text, sections);

    return concepts;
  }

  private mapCategoryToType(category: ExtractedKeyword['category']): ConceptNode['type'] {
    const mapping = {
      'concept': 'concept' as const,
      'method': 'method' as const,
      'technique': 'technology' as const,
      'entity': 'organization' as const,
      'domain': 'concept' as const
    };
    return mapping[category];
  }

  private findMentions(term: string, sections: ContentSection[]): TextMention[] {
    const mentions: TextMention[] = [];
    
    sections.forEach(section => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      let match;
      
      while ((match = regex.exec(section.content)) !== null) {
        const start = Math.max(0, match.index - 50);
        const end = Math.min(section.content.length, match.index + term.length + 50);
        const context = section.content.substring(start, end);
        
        mentions.push({
          sectionId: section.id,
          position: match.index,
          context,
          confidence: 0.8
        });
        
        if (mentions.length >= 5) break; // 限制每個術語的提及次數
      }
    });

    return mentions;
  }

  private extractDefinition(term: string, text: string): string | undefined {
    // 尋找定義模式
    const definitionPatterns = [
      new RegExp(`${term}\\s*[是為]\\s*([^。！？\n]{10,100}[。！？])`, 'i'),
      new RegExp(`${term}\\s*refers to\\s*([^.!?\n]{10,100}[.!?])`, 'i'),
      new RegExp(`${term}\\s*is\\s*([^.!?\n]{10,100}[.!?])`, 'i'),
      new RegExp(`(?:定義|定义).*?${term}.*?[：:]\\s*([^。！？\n]{10,100}[。！？])`, 'i')
    ];

    for (const pattern of definitionPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  private buildConceptConnections(concepts: ConceptNode[], text: string, sections: ContentSection[]): void {
    // 為每對概念檢查潛在連接
    for (let i = 0; i < concepts.length; i++) {
      for (let j = i + 1; j < concepts.length; j++) {
        const conceptA = concepts[i];
        const conceptB = concepts[j];
        
        const connection = this.analyzeConceptRelation(conceptA, conceptB, text);
        if (connection) {
          conceptA.connections.push({
            targetId: conceptB.id,
            relationshipType: connection.type,
            strength: connection.strength,
            evidence: connection.evidence
          });

          // 添加反向連接
          conceptB.connections.push({
            targetId: conceptA.id,
            relationshipType: connection.type,
            strength: connection.strength,
            evidence: connection.evidence
          });
        }
      }
    }
  }

  private analyzeConceptRelation(conceptA: ConceptNode, conceptB: ConceptNode, text: string): {
    type: ConceptConnection['relationshipType'];
    strength: number;
    evidence: string[];
  } | null {
    const termA = conceptA.name;
    const termB = conceptB.name;
    
    // 關係模式
    const relationPatterns = [
      { pattern: new RegExp(`${termA}.*?導致.*?${termB}`, 'i'), type: 'causes' as const, strength: 0.8 },
      { pattern: new RegExp(`${termA}.*?影響.*?${termB}`, 'i'), type: 'influences' as const, strength: 0.7 },
      { pattern: new RegExp(`${termA}.*?支持.*?${termB}`, 'i'), type: 'supports' as const, strength: 0.6 },
      { pattern: new RegExp(`${termA}.*?相關.*?${termB}`, 'i'), type: 'related' as const, strength: 0.5 },
      { pattern: new RegExp(`${termB}.*?導致.*?${termA}`, 'i'), type: 'causes' as const, strength: 0.8 },
      { pattern: new RegExp(`${termB}.*?影響.*?${termA}`, 'i'), type: 'influences' as const, strength: 0.7 }
    ];

    for (const { pattern, type, strength } of relationPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        return {
          type,
          strength,
          evidence: [matches[0].substring(0, 100)]
        };
      }
    }

    // 檢查共現頻率
    const cooccurrenceStrength = this.calculateCooccurrence(termA, termB, text);
    if (cooccurrenceStrength > 0.3) {
      return {
        type: 'related',
        strength: cooccurrenceStrength,
        evidence: [`共現強度: ${cooccurrenceStrength.toFixed(2)}`]
      };
    }

    return null;
  }

  private calculateCooccurrence(termA: string, termB: string, text: string): number {
    const windowSize = 100; // 詞彙窗口大小
    const sentences = text.split(/[。！？.!?]/);
    let cooccurrences = 0;
    let totalOpportunities = 0;

    for (const sentence of sentences) {
      const hasA = sentence.toLowerCase().includes(termA.toLowerCase());
      const hasB = sentence.toLowerCase().includes(termB.toLowerCase());
      
      if (hasA || hasB) {
        totalOpportunities++;
        if (hasA && hasB) {
          cooccurrences++;
        }
      }
    }

    return totalOpportunities > 0 ? cooccurrences / totalOpportunities : 0;
  }

  /**
   * 4. 多層摘要生成器
   */
  private async generateLayeredSummaries(
    text: string, 
    sections: ContentSection[], 
    keywords: ExtractedKeyword[]
  ): Promise<LayeredSummary> {
    
    const keyTerms = keywords.slice(0, 10).map(k => k.term);
    
    return {
      basic: await this.generateBasicSummary(text, sections, keyTerms),
      professional: await this.generateProfessionalSummary(text, sections, keyTerms),
      academic: await this.generateAcademicSummary(text, sections, keyTerms)
    };
  }

  private async generateBasicSummary(text: string, sections: ContentSection[], keyTerms: string[]): Promise<LayeredSummary['basic']> {
    // 選擇最重要的段落 (通常是引言和結論)
    const importantSections = sections.filter(s => 
      s.type === 'introduction' || s.type === 'conclusion' || s.type === 'other'
    ).slice(0, 3);

    let summary = '';
    const keyPoints: string[] = [];

    if (importantSections.length > 0) {
      // 從每個重要章節提取核心句子
      for (const section of importantSections) {
        const sentences = section.content.split(/[。！？.!?]/).filter(s => s.trim().length > 10);
        const coreSentences = sentences
          .filter(sentence => keyTerms.some(term => sentence.includes(term)))
          .slice(0, 2);
        
        if (coreSentences.length > 0) {
          summary += coreSentences.join('。') + '。';
          keyPoints.push(section.title);
        }
      }
    }

    // 如果摘要太短，添加關鍵信息
    if (summary.length < 100) {
      const firstSection = sections[0];
      if (firstSection) {
        const sentences = firstSection.content.split(/[。！？.!?]/).filter(s => s.trim().length > 10);
        summary = sentences.slice(0, 3).join('。') + '。';
      }
    }

    // 限制摘要長度
    if (summary.length > 300) {
      summary = summary.substring(0, 300) + '...';
    }

    return {
      content: summary || '無法生成摘要',
      keyPoints: keyPoints.length > 0 ? keyPoints : ['主要內容'],
      readingTime: Math.ceil(summary.split(/\s+/).length / 200) // 假設每分鐘200詞
    };
  }

  private async generateProfessionalSummary(text: string, sections: ContentSection[], keyTerms: string[]): Promise<LayeredSummary['professional']> {
    let summary = '';
    const keyPoints: string[] = [];
    const technicalTerms: string[] = [];

    // 包含方法論和結果
    const professionalSections = sections.filter(s => 
      ['introduction', 'methodology', 'results', 'discussion'].includes(s.type)
    );

    for (const section of professionalSections) {
      const sentences = section.content.split(/[。！？.!?]/).filter(s => s.trim().length > 10);
      
      // 選擇包含關鍵詞的句子
      const relevantSentences = sentences
        .filter(sentence => keyTerms.some(term => sentence.includes(term)))
        .slice(0, 3);
      
      if (relevantSentences.length > 0) {
        summary += `\n\n${section.title}:\n${relevantSentences.join('。')}。`;
        keyPoints.push(section.title);
      }
    }

    // 提取技術術語
    keyTerms.forEach(term => {
      if (/[A-Z]/.test(term) || term.length > 6) {
        technicalTerms.push(term);
      }
    });

    return {
      content: summary.trim() || '無法生成專業摘要',
      keyPoints,
      technicalTerms: technicalTerms.slice(0, 8),
      readingTime: Math.ceil(summary.split(/\s+/).length / 180)
    };
  }

  private async generateAcademicSummary(text: string, sections: ContentSection[], keyTerms: string[]): Promise<LayeredSummary['academic']> {
    let summary = '';
    const keyPoints: string[] = [];
    let methodology = '';
    const findings: string[] = [];
    const limitations: string[] = [];

    // 學術摘要包含所有主要章節
    for (const section of sections) {
      if (section.type === 'other' && section.wordCount < 50) continue; // 跳過太短的章節
      
      const sentences = section.content.split(/[。！？.!?]/).filter(s => s.trim().length > 10);
      const sectionSummary = sentences.slice(0, 4).join('。') + '。';
      
      summary += `\n\n${section.title}:\n${sectionSummary}`;
      keyPoints.push(section.title);

      // 特殊處理不同類型的章節
      if (section.type === 'methodology') {
        methodology = sectionSummary;
      } else if (section.type === 'results') {
        findings.push(...sentences.slice(0, 3));
      }
    }

    // 尋找限制性描述
    const limitationKeywords = ['限制', '局限', '不足', 'limitation', 'constraint'];
    const textSentences = text.split(/[。！？.!?]/);
    
    for (const sentence of textSentences) {
      if (limitationKeywords.some(keyword => sentence.includes(keyword))) {
        limitations.push(sentence.trim());
        if (limitations.length >= 3) break;
      }
    }

    return {
      content: summary.trim() || '無法生成學術摘要',
      keyPoints,
      methodology: methodology || '方法論未明確描述',
      findings: findings.length > 0 ? findings : ['研究發現未明確描述'],
      limitations: limitations.length > 0 ? limitations : ['研究限制未明確說明'],
      readingTime: Math.ceil(summary.split(/\s+/).length / 150)
    };
  }

  /**
   * 輔助方法：計算整體信心度
   */
  private calculateOverallConfidence(
    sections: ContentSection[], 
    keywords: ExtractedKeyword[], 
    conceptMap: ConceptNode[]
  ): number {
    const sectionConfidence = sections.reduce((sum, s) => sum + s.confidence, 0) / sections.length;
    const keywordQuality = keywords.length > 10 ? 1.0 : keywords.length / 10;
    const conceptMapRichness = conceptMap.length > 5 ? 1.0 : conceptMap.length / 5;
    
    return (sectionConfidence * 0.4 + keywordQuality * 0.3 + conceptMapRichness * 0.3);
  }

  async terminate(): Promise<void> {
    this.isInitialized = false;
    console.log('Text Processing Service terminated');
  }
}