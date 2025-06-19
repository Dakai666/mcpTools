/**
 * 跨源內容關聯服務
 * Phase 3.3 實現 - 智能跨源內容相關性分析
 */

// 實體對齊結果
interface EntityAlignment {
  id: string;
  mainName: string;
  aliases: string[];
  sources: {
    source: string;
    name: string;
    confidence: number;
    context: string;
  }[];
  entityType: 'person' | 'organization' | 'concept' | 'technology' | 'event' | 'location';
  confidence: number;
  mergedInfo: {
    definition: string;
    keyAttributes: string[];
    relationships: string[];
  };
}

// 時間軸事件
interface TimelineEvent {
  id: string;
  title: string;
  date: Date | string;
  dateConfidence: number;
  description: string;
  sources: string[];
  importance: number;
  category: 'discovery' | 'invention' | 'publication' | 'milestone' | 'controversy' | 'application';
  relatedEntities: string[];
}

// 觀點比較結果
interface PerspectiveComparison {
  topic: string;
  perspectives: {
    source: string;
    viewpoint: string;
    evidence: string[];
    confidence: number;
    stance: 'positive' | 'negative' | 'neutral' | 'mixed';
  }[];
  consensus: {
    agreements: string[];
    disagreements: string[];
    uncertainties: string[];
  };
  synthesis: string;
}

// 可信度評估
interface CredibilityAssessment {
  overall: number;
  factors: {
    sourceReliability: number;
    citationCount: number;
    expertiseLevel: number;
    recency: number;
    crossValidation: number;
  };
  breakdown: {
    source: string;
    reliability: number;
    reasoning: string;
  }[];
  recommendations: string[];
}

// 關聯結果
interface CorrelationResult {
  success: boolean;
  data?: {
    entities: EntityAlignment[];
    timeline: TimelineEvent[];
    perspectives: PerspectiveComparison[];
    credibility: CredibilityAssessment;
    correlationMatrix: {
      source1: string;
      source2: string;
      similarity: number;
      commonEntities: string[];
      conflicts: string[];
    }[];
    synthesizedContent: {
      summary: string;
      keyFindings: string[];
      limitations: string[];
      recommendations: string[];
    };
  };
  metadata: {
    timestamp: Date;
    processingTime: number;
    sourcesAnalyzed: number;
    confidence: number;
  };
  error?: any;
}

export class CrossSourceCorrelationService {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('🔗 Initializing Cross-Source Correlation Service...');
    
    try {
      // 初始化自然語言處理組件
      this.isInitialized = true;
      console.log('✅ Cross-Source Correlation Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Cross-Source Correlation Service:', error);
      throw error;
    }
  }

  /**
   * 主要關聯分析方法
   */
  async correlateContent(
    sources: {
      source: string;
      content: string;
      metadata: any;
    }[]
  ): Promise<CorrelationResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    
    try {
      console.log(`🔗 開始跨源內容關聯分析 (${sources.length} 個來源)...`);

      // 步驟 1: 實體對齊
      console.log('📊 執行實體對齊分析...');
      const entities = await this.alignEntities(sources);

      // 步驟 2: 時間軸整合
      console.log('⏰ 執行時間軸整合...');
      const timeline = await this.integrateTimelines(sources);

      // 步驟 3: 觀點比較
      console.log('🔍 執行觀點比較分析...');
      const perspectives = await this.comparePerspectives(sources);

      // 步驟 4: 可信度評估
      console.log('📈 執行可信度評估...');
      const credibility = await this.assessCredibility(sources);

      // 步驟 5: 計算關聯矩陣
      console.log('🔗 計算關聯矩陣...');
      const correlationMatrix = await this.calculateCorrelationMatrix(sources, entities);

      // 步驟 6: 生成綜合內容
      console.log('📝 生成綜合內容...');
      const synthesizedContent = await this.synthesizeContent(entities, timeline, perspectives, credibility);

      const processingTime = Date.now() - startTime;
      const confidence = this.calculateOverallConfidence(entities, perspectives, credibility);

      console.log(`✅ 跨源關聯分析完成 (${processingTime}ms, 信心度: ${(confidence * 100).toFixed(1)}%)`);

      return {
        success: true,
        data: {
          entities,
          timeline,
          perspectives,
          credibility,
          correlationMatrix,
          synthesizedContent
        },
        metadata: {
          timestamp: new Date(),
          processingTime,
          sourcesAnalyzed: sources.length,
          confidence
        }
      };

    } catch (error) {
      console.error('跨源關聯分析錯誤:', error);
      return {
        success: false,
        metadata: {
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
          sourcesAnalyzed: sources.length,
          confidence: 0
        },
        error: {
          code: 'CORRELATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          source: 'cross-source-correlation'
        }
      };
    }
  }

  /**
   * 實體對齊 - 識別不同源中的相同概念
   */
  private async alignEntities(sources: any[]): Promise<EntityAlignment[]> {
    const entities: EntityAlignment[] = [];
    const entityCandidates = new Map<string, any[]>();

    // 從每個來源提取實體
    for (const source of sources) {
      const extractedEntities = this.extractEntitiesFromContent(source.content, source.source);
      
      for (const entity of extractedEntities) {
        const normalizedName = this.normalizeEntityName(entity.name);
        
        if (!entityCandidates.has(normalizedName)) {
          entityCandidates.set(normalizedName, []);
        }
        
        entityCandidates.get(normalizedName)!.push({
          ...entity,
          source: source.source,
          originalContent: source.content
        });
      }
    }

    // 對齊相似實體
    for (const [normalizedName, candidates] of entityCandidates) {
      if (candidates.length >= 2) { // 至少在兩個來源中出現
        const aligned = this.alignSimilarEntities(candidates);
        if (aligned) {
          entities.push(aligned);
        }
      }
    }

    console.log(`📊 實體對齊完成: 識別了 ${entities.length} 個跨源實體`);
    return entities;
  }

  /**
   * 時間軸整合 - 合併不同源的時間線信息
   */
  private async integrateTimelines(sources: any[]): Promise<TimelineEvent[]> {
    const events: TimelineEvent[] = [];

    for (const source of sources) {
      const sourceEvents = this.extractTimelineEvents(source.content, source.source);
      events.push(...sourceEvents);
    }

    // 合併相似事件
    const mergedEvents = this.mergeTimelineEvents(events);
    
    // 按時間排序
    mergedEvents.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB;
    });

    console.log(`⏰ 時間軸整合完成: 識別了 ${mergedEvents.length} 個時間事件`);
    return mergedEvents;
  }

  /**
   * 觀點比較 - 自動識別不同觀點和爭議
   */
  private async comparePerspectives(sources: any[]): Promise<PerspectiveComparison[]> {
    const comparisons: PerspectiveComparison[] = [];
    const topics = this.identifyCommonTopics(sources);

    for (const topic of topics) {
      const perspectives = sources.map(source => {
        const viewpoint = this.extractViewpoint(source.content, topic);
        return {
          source: source.source,
          viewpoint: viewpoint.statement,
          evidence: viewpoint.evidence,
          confidence: viewpoint.confidence,
          stance: this.classifyStance(viewpoint.statement)
        };
      }).filter(p => p.confidence > 0.3);

      if (perspectives.length >= 2) {
        const consensus = this.analyzeConsensus(perspectives);
        const synthesis = this.synthesizeViewpoints(perspectives);

        comparisons.push({
          topic,
          perspectives,
          consensus,
          synthesis
        });
      }
    }

    console.log(`🔍 觀點比較完成: 分析了 ${comparisons.length} 個主題的觀點`);
    return comparisons;
  }

  /**
   * 可信度評估 - 基於來源和引用的可信度分析
   */
  private async assessCredibility(sources: any[]): Promise<CredibilityAssessment> {
    const breakdown = sources.map(source => {
      const reliability = this.evaluateSourceReliability(source);
      return {
        source: source.source,
        reliability,
        reasoning: this.generateReliabilityReasoning(source, reliability)
      };
    });

    const factors = this.calculateCredibilityFactors(sources);
    const overall = this.calculateOverallCredibility(factors, breakdown);
    const recommendations = this.generateCredibilityRecommendations(factors, breakdown);

    console.log(`📈 可信度評估完成: 整體可信度 ${(overall * 100).toFixed(1)}%`);

    return {
      overall,
      factors,
      breakdown,
      recommendations
    };
  }

  /**
   * 計算關聯矩陣
   */
  private async calculateCorrelationMatrix(sources: any[], entities: EntityAlignment[]): Promise<any[]> {
    const matrix = [];

    for (let i = 0; i < sources.length; i++) {
      for (let j = i + 1; j < sources.length; j++) {
        const source1 = sources[i];
        const source2 = sources[j];
        
        const similarity = this.calculateContentSimilarity(source1.content, source2.content);
        const commonEntities = this.findCommonEntities(source1, source2, entities);
        const conflicts = this.identifyConflicts(source1, source2);

        matrix.push({
          source1: source1.source,
          source2: source2.source,
          similarity,
          commonEntities,
          conflicts
        });
      }
    }

    return matrix;
  }

  /**
   * 綜合內容生成
   */
  private async synthesizeContent(
    entities: EntityAlignment[],
    timeline: TimelineEvent[],
    perspectives: PerspectiveComparison[],
    credibility: CredibilityAssessment
  ): Promise<any> {
    const keyFindings = [
      ...entities.slice(0, 5).map(e => `識別關鍵實體: ${e.mainName} (信心度: ${(e.confidence * 100).toFixed(1)}%)`),
      ...timeline.slice(0, 3).map(t => `重要時間節點: ${t.title} (${t.date})`),
      ...perspectives.slice(0, 3).map(p => `觀點共識: ${p.topic}`)
    ];

    const limitations = [
      credibility.overall < 0.8 ? '部分來源可信度有待提高' : null,
      entities.length < 3 ? '實體識別數量有限' : null,
      perspectives.length < 2 ? '觀點多樣性不足' : null
    ].filter(Boolean);

    const recommendations = [
      '建議查閱更多一手資料驗證關鍵發現',
      '考慮補充專家觀點以增加分析深度',
      '持續追蹤相關領域的最新發展'
    ];

    const summary = this.generateComprehensiveSummary(entities, timeline, perspectives, credibility);

    return {
      summary,
      keyFindings,
      limitations,
      recommendations
    };
  }

  // ===== 私有輔助方法 =====

  private extractEntitiesFromContent(content: string, source: string): any[] {
    // 使用正則表達式和關鍵詞匹配提取實體
    const entities: any[] = [];
    
    // 人名模式 (簡化版)
    const personPattern = /([A-Z][a-z]+\s+[A-Z][a-z]+|[\u4e00-\u9fa5]{2,4})/g;
    const persons = content.match(personPattern) || [];
    
    persons.forEach(name => {
      if (name.length > 1 && !this.isCommonWord(name)) {
        entities.push({
          name: name.trim(),
          type: 'person',
          confidence: 0.7,
          context: this.extractContext(content, name)
        });
      }
    });

    // 概念和技術術語
    const conceptPattern = /\b([A-Z][a-z]*(?:\s+[A-Z][a-z]*)*|[\u4e00-\u9fa5]{3,8})\b/g;
    const concepts = content.match(conceptPattern) || [];
    
    concepts.forEach(concept => {
      if (this.isTechnicalTerm(concept)) {
        entities.push({
          name: concept.trim(),
          type: 'concept',
          confidence: 0.6,
          context: this.extractContext(content, concept)
        });
      }
    });

    return entities.slice(0, 20); // 限制數量
  }

  private normalizeEntityName(name: string): string {
    return name.toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fa5]/g, '')
      .trim();
  }

  private alignSimilarEntities(candidates: any[]): EntityAlignment | null {
    if (candidates.length < 2) return null;

    const mainCandidate = candidates[0];
    const aliases = [...new Set(candidates.map(c => c.name))];
    
    return {
      id: `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      mainName: mainCandidate.name,
      aliases,
      sources: candidates.map(c => ({
        source: c.source,
        name: c.name,
        confidence: c.confidence,
        context: c.context
      })),
      entityType: mainCandidate.type,
      confidence: candidates.reduce((sum, c) => sum + c.confidence, 0) / candidates.length,
      mergedInfo: {
        definition: this.generateEntityDefinition(candidates),
        keyAttributes: this.extractKeyAttributes(candidates),
        relationships: this.identifyRelationships(candidates)
      }
    };
  }

  private extractTimelineEvents(content: string, source: string): TimelineEvent[] {
    const events: TimelineEvent[] = [];
    
    // 查找日期模式
    const datePatterns = [
      /(\d{4})年/g,
      /(\d{4})\s*年/g,
      /in\s+(\d{4})/gi,
      /(\d{4})\s*(AD|BC|CE|BCE)/gi
    ];

    for (const pattern of datePatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const year = match[1];
        const context = this.extractContext(content, match[0]);
        
        if (context && year) {
          events.push({
            id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: this.extractEventTitle(context),
            date: `${year}-01-01`,
            dateConfidence: 0.7,
            description: context.slice(0, 200),
            sources: [source],
            importance: this.calculateEventImportance(context),
            category: this.classifyEventCategory(context),
            relatedEntities: []
          });
        }
      }
    }

    return events.slice(0, 10); // 限制數量
  }

  private mergeTimelineEvents(events: TimelineEvent[]): TimelineEvent[] {
    const merged = [];
    const processed = new Set();

    for (const event of events) {
      if (processed.has(event.id)) continue;

      const similar = events.filter(e => 
        e.id !== event.id && 
        !processed.has(e.id) && 
        this.areEventsSimilar(event, e)
      );

      if (similar.length > 0) {
        const mergedEvent = this.mergeEvents([event, ...similar]);
        merged.push(mergedEvent);
        processed.add(event.id);
        similar.forEach(e => processed.add(e.id));
      } else {
        merged.push(event);
        processed.add(event.id);
      }
    }

    return merged;
  }

  private identifyCommonTopics(sources: any[]): string[] {
    const topics = new Set<string>();
    
    // 簡化的主題識別 - 基於關鍵詞頻率
    const allContent = sources.map(s => s.content).join(' ');
    const words = allContent.toLowerCase().match(/[\u4e00-\u9fa5]{2,}|\b[a-z]{3,}\b/gi) || [];
    
    const wordFreq = new Map();
    words.forEach(word => {
      if (!this.isStopWord(word)) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    });

    // 選擇高頻且在多個來源中出現的詞作為主題
    for (const [word, freq] of wordFreq) {
      if (freq >= 3 && this.appearsInMultipleSources(word, sources)) {
        topics.add(word);
      }
    }

    return Array.from(topics).slice(0, 10);
  }

  private extractViewpoint(content: string, topic: string): any {
    // 查找包含主題的句子
    const sentences = content.split(/[。！？.!?]/).filter(s => 
      s.toLowerCase().includes(topic.toLowerCase())
    );

    if (sentences.length === 0) {
      return { statement: '', evidence: [], confidence: 0 };
    }

    const statement = sentences[0].trim();
    const evidence = sentences.slice(1, 3).map(s => s.trim()).filter(s => s.length > 10);
    const confidence = Math.min(0.8, sentences.length * 0.2);

    return { statement, evidence, confidence };
  }

  private classifyStance(statement: string): 'positive' | 'negative' | 'neutral' | 'mixed' {
    const positiveWords = ['優秀', '成功', '有效', '重要', '領先', '創新', 'effective', 'successful', 'important'];
    const negativeWords = ['問題', '困難', '挑戰', '失敗', '限制', 'problem', 'difficult', 'challenge', 'limitation'];

    const lowerStatement = statement.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerStatement.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerStatement.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    if (positiveCount > 0 && negativeCount > 0) return 'mixed';
    return 'neutral';
  }

  private analyzeConsensus(perspectives: any[]): any {
    const agreements: string[] = [];
    const disagreements: string[] = [];
    const uncertainties: string[] = [];

    // 簡化的共識分析
    const stances = perspectives.map(p => p.stance);
    const uniqueStances = [...new Set(stances)];

    if (uniqueStances.length === 1) {
      agreements.push(`所有來源對此主題持${uniqueStances[0]}態度`);
    } else {
      disagreements.push(`不同來源存在觀點分歧`);
    }

    // 查找低信心度的觀點
    perspectives.forEach(p => {
      if (p.confidence < 0.5) {
        uncertainties.push(`${p.source}的觀點存在不確定性`);
      }
    });

    return { agreements, disagreements, uncertainties };
  }

  private synthesizeViewpoints(perspectives: any[]): string {
    const stanceDistribution = perspectives.reduce((acc, p) => {
      acc[p.stance] = (acc[p.stance] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dominantStance = Object.entries(stanceDistribution)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0][0];

    return `綜合分析顯示，大多數來源對此主題持${dominantStance}態度，` +
           `但在具體細節上存在${Object.keys(stanceDistribution).length}種不同觀點。`;
  }

  private evaluateSourceReliability(source: any): number {
    let score = 0.5; // 基礎分數

    // 根據來源類型調整
    switch (source.source) {
      case 'arxiv':
        score += 0.3; // 學術論文較可信
        break;
      case 'semanticscholar':
        score += 0.25; // 同行評議較可信
        break;
      case 'wikipedia':
        score += 0.15; // 百科全書一般可信
        break;
    }

    // 根據內容長度調整（更詳細 = 更可信）
    if (source.content && source.content.length > 1000) {
      score += 0.1;
    }

    return Math.min(1.0, score);
  }

  private generateReliabilityReasoning(source: any, reliability: number): string {
    const reasons = [];

    if (source.source === 'arxiv') {
      reasons.push('學術論文來源');
    }
    if (source.content && source.content.length > 1000) {
      reasons.push('內容詳細');
    }
    if (reliability > 0.8) {
      reasons.push('高可信度來源');
    } else if (reliability < 0.5) {
      reasons.push('需要更多驗證');
    }

    return reasons.join(', ') || '標準評估';
  }

  private calculateCredibilityFactors(sources: any[]): any {
    return {
      sourceReliability: sources.reduce((sum, s) => sum + this.evaluateSourceReliability(s), 0) / sources.length,
      citationCount: 0.7, // 簡化值
      expertiseLevel: 0.6, // 簡化值
      recency: 0.8, // 簡化值
      crossValidation: sources.length > 1 ? 0.8 : 0.4
    };
  }

  private calculateOverallCredibility(factors: any, breakdown: any[]): number {
    const weights = {
      sourceReliability: 0.3,
      citationCount: 0.2,
      expertiseLevel: 0.2,
      recency: 0.15,
      crossValidation: 0.15
    };

    return Object.entries(weights).reduce((sum, [key, weight]) => {
      return sum + factors[key] * weight;
    }, 0);
  }

  private generateCredibilityRecommendations(factors: any, breakdown: any[]): string[] {
    const recommendations = [];

    if (factors.sourceReliability < 0.7) {
      recommendations.push('建議增加更多權威來源');
    }
    if (factors.crossValidation < 0.6) {
      recommendations.push('需要更多來源進行交叉驗證');
    }
    if (breakdown.some(b => b.reliability < 0.5)) {
      recommendations.push('部分來源可信度較低，建議謹慎使用');
    }

    return recommendations;
  }

  private calculateContentSimilarity(content1: string, content2: string): number {
    // 簡化的相似度計算 - 基於共同詞彙
    const words1 = new Set(content1.toLowerCase().match(/[\u4e00-\u9fa5]{2,}|\b[a-z]{3,}\b/gi) || []);
    const words2 = new Set(content2.toLowerCase().match(/[\u4e00-\u9fa5]{2,}|\b[a-z]{3,}\b/gi) || []);
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private findCommonEntities(source1: any, source2: any, entities: EntityAlignment[]): string[] {
    return entities
      .filter(entity => 
        entity.sources.some(s => s.source === source1.source) &&
        entity.sources.some(s => s.source === source2.source)
      )
      .map(entity => entity.mainName);
  }

  private identifyConflicts(source1: any, source2: any): string[] {
    // 簡化的衝突識別
    const conflicts = [];
    
    // 查找矛盾的表述
    const contradictoryPatterns = [
      ['增加', '減少'],
      ['提高', '降低'],
      ['支持', '反對'],
      ['成功', '失敗']
    ];

    for (const [word1, word2] of contradictoryPatterns) {
      if (source1.content.includes(word1) && source2.content.includes(word2)) {
        conflicts.push(`${source1.source}提到${word1}，而${source2.source}提到${word2}`);
      }
    }

    return conflicts;
  }

  private calculateOverallConfidence(entities: EntityAlignment[], perspectives: PerspectiveComparison[], credibility: CredibilityAssessment): number {
    const entityConfidence = entities.length > 0 ? 
      entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length : 0.5;
    
    const perspectiveConfidence = perspectives.length > 0 ? 
      perspectives.reduce((sum, p) => sum + p.perspectives.reduce((pSum, pp) => pSum + pp.confidence, 0) / p.perspectives.length, 0) / perspectives.length : 0.5;

    return (entityConfidence * 0.3 + perspectiveConfidence * 0.3 + credibility.overall * 0.4);
  }

  private generateComprehensiveSummary(entities: EntityAlignment[], timeline: TimelineEvent[], perspectives: PerspectiveComparison[], credibility: CredibilityAssessment): string {
    return `跨源分析完成：識別了${entities.length}個關鍵實體，整理了${timeline.length}個時間節點，` +
           `分析了${perspectives.length}個主題的觀點，整體可信度為${(credibility.overall * 100).toFixed(1)}%。` +
           `分析顯示了不同知識源之間的關聯性和互補性，為深入理解主題提供了多維度視角。`;
  }

  // 更多輔助方法
  private isCommonWord(word: string): boolean {
    const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', '的', '了', '是', '在', '有', '和'];
    return commonWords.includes(word.toLowerCase());
  }

  private isTechnicalTerm(word: string): boolean {
    // 簡化的技術術語識別
    return word.length >= 3 && !this.isCommonWord(word) && 
           (!!word.match(/[A-Z]/) || !!word.match(/[\u4e00-\u9fa5]/));
  }

  private extractContext(content: string, term: string): string {
    const index = content.indexOf(term);
    if (index === -1) return '';
    
    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + term.length + 50);
    return content.slice(start, end);
  }

  private generateEntityDefinition(candidates: any[]): string {
    const contexts = candidates.map(c => c.context).filter(c => c && c.length > 10);
    return contexts.length > 0 ? contexts[0].slice(0, 100) + '...' : '實體定義待完善';
  }

  private extractKeyAttributes(candidates: any[]): string[] {
    // 簡化的屬性提取
    return ['基本屬性', '相關特徵', '重要特性'].slice(0, candidates.length);
  }

  private identifyRelationships(candidates: any[]): string[] {
    return ['相關概念', '關聯實體'].slice(0, Math.min(2, candidates.length));
  }

  private extractEventTitle(context: string): string {
    // 提取事件標題的簡化邏輯
    const sentences = context.split(/[。！？.!?]/);
    return sentences[0]?.slice(0, 50) || '重要事件';
  }

  private calculateEventImportance(context: string): number {
    // 基於關鍵詞計算重要性
    const importantWords = ['重要', '關鍵', '突破', '發現', '發明', 'important', 'breakthrough', 'discovery'];
    const foundWords = importantWords.filter(word => context.toLowerCase().includes(word));
    return Math.min(10, foundWords.length * 2 + 5);
  }

  private classifyEventCategory(context: string): any {
    if (context.includes('發現') || context.includes('discovery')) return 'discovery';
    if (context.includes('發明') || context.includes('invention')) return 'invention';
    if (context.includes('發表') || context.includes('publication')) return 'publication';
    if (context.includes('應用') || context.includes('application')) return 'application';
    return 'milestone';
  }

  private areEventsSimilar(event1: TimelineEvent, event2: TimelineEvent): boolean {
    // 檢查日期相近性和標題相似性
    const date1 = new Date(event1.date).getFullYear();
    const date2 = new Date(event2.date).getFullYear();
    const dateSimilar = Math.abs(date1 - date2) <= 2;
    
    const titleSimilar = this.calculateContentSimilarity(event1.title, event2.title) > 0.6;
    
    return dateSimilar && titleSimilar;
  }

  private mergeEvents(events: TimelineEvent[]): TimelineEvent {
    const main = events[0];
    const allSources = [...new Set(events.flatMap(e => e.sources))];
    const avgImportance = events.reduce((sum, e) => sum + e.importance, 0) / events.length;
    
    return {
      ...main,
      sources: allSources,
      importance: avgImportance,
      description: events.map(e => e.description).join(' '),
    };
  }

  private isStopWord(word: string): boolean {
    const stopWords = ['的', '了', '是', '在', '有', '和', '與', '或', 'the', 'and', 'or', 'but', 'in', 'on', 'at'];
    return stopWords.includes(word.toLowerCase()) || word.length < 2;
  }

  private appearsInMultipleSources(word: string, sources: any[]): boolean {
    const appearances = sources.filter(s => s.content.toLowerCase().includes(word.toLowerCase()));
    return appearances.length >= 2;
  }

  async terminate(): Promise<void> {
    console.log('🔗 Terminating Cross-Source Correlation Service...');
    this.isInitialized = false;
    console.log('✅ Cross-Source Correlation Service terminated');
  }
}