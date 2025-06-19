/**
 * 知識圖譜構建服務
 * Phase 3.4 實現 - 實體識別、關係抽取和圖結構構建
 */

// 實體節點
interface KnowledgeNode {
  id: string;
  label: string;
  type: 'Person' | 'Organization' | 'Concept' | 'Technology' | 'Event' | 'Location' | 'Publication';
  properties: {
    name: string;
    description: string;
    aliases: string[];
    confidence: number;
    sources: string[];
    importance: number;
    attributes: Record<string, any>;
  };
  position?: {
    x: number;
    y: number;
  };
}

// 關係邊
interface KnowledgeEdge {
  id: string;
  source: string;
  target: string;
  relationship: string;
  type: 'CREATED' | 'INFLUENCED' | 'BELONGS_TO' | 'RELATED_TO' | 'USES' | 'PART_OF' | 'CAUSED' | 'DISCOVERED';
  properties: {
    weight: number;
    confidence: number;
    sources: string[];
    evidence: string[];
    temporal?: {
      start?: Date | string;
      end?: Date | string;
    };
  };
}

// 知識圖譜
interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    version: string;
    totalNodes: number;
    totalEdges: number;
    sources: string[];
    confidence: number;
    categories: Record<string, number>;
  };
  clusters?: {
    id: string;
    name: string;
    nodes: string[];
    centrality: number;
  }[];
  paths?: {
    from: string;
    to: string;
    path: string[];
    weight: number;
  }[];
}

// 圖查詢結果
interface GraphQueryResult {
  success: boolean;
  data?: {
    nodes: KnowledgeNode[];
    edges: KnowledgeEdge[];
    paths?: any[];
    clusters?: any[];
    statistics: {
      nodeCount: number;
      edgeCount: number;
      avgDegree: number;
      maxDegree: number;
      centralNodes: string[];
    };
  };
  metadata: {
    timestamp: Date;
    processingTime: number;
    queryType: string;
  };
  error?: any;
}

export class KnowledgeGraphService {
  private isInitialized = false;
  private graph: KnowledgeGraph;

  constructor() {
    this.graph = {
      nodes: [],
      edges: [],
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        totalNodes: 0,
        totalEdges: 0,
        sources: [],
        confidence: 0,
        categories: {}
      }
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('🗺️ Initializing Knowledge Graph Service...');
    
    try {
      this.isInitialized = true;
      console.log('✅ Knowledge Graph Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Knowledge Graph Service:', error);
      throw error;
    }
  }

  /**
   * 構建知識圖譜 - 主要入口方法
   */
  async buildKnowledgeGraph(
    sources: {
      source: string;
      content: string;
      entities?: any[];
      correlations?: any;
    }[]
  ): Promise<{
    success: boolean;
    data?: KnowledgeGraph;
    metadata: any;
    error?: any;
  }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    
    try {
      console.log(`🗺️ 開始構建知識圖譜 (${sources.length} 個來源)...`);

      // 步驟 1: 實體識別和提取
      console.log('🔍 執行實體識別...');
      const allEntities = await this.extractAllEntities(sources);

      // 步驟 2: 實體融合和去重
      console.log('🔗 執行實體融合...');
      const mergedEntities = await this.mergeEntities(allEntities);

      // 步驟 3: 關係抽取
      console.log('⚡ 執行關係抽取...');
      const relationships = await this.extractRelationships(sources, mergedEntities);

      // 步驟 4: 構建圖結構
      console.log('🏗️ 構建圖結構...');
      const nodes = this.createNodes(mergedEntities);
      const edges = this.createEdges(relationships);

      // 步驟 5: 圖分析和優化
      console.log('📊 執行圖分析...');
      const clusters = this.detectClusters(nodes, edges);
      const paths = this.findImportantPaths(nodes, edges);
      const positions = this.calculateLayout(nodes, edges);

      // 更新圖對象
      this.graph = {
        nodes: nodes.map((node, index) => ({
          ...node,
          position: positions[index]
        })),
        edges,
        metadata: {
          createdAt: this.graph.metadata.createdAt,
          updatedAt: new Date(),
          version: '1.0.0',
          totalNodes: nodes.length,
          totalEdges: edges.length,
          sources: sources.map(s => s.source),
          confidence: this.calculateGraphConfidence(nodes, edges),
          categories: this.categorizeNodes(nodes)
        },
        clusters,
        paths
      };

      const processingTime = Date.now() - startTime;
      console.log(`✅ 知識圖譜構建完成 (${processingTime}ms, ${nodes.length} 節點, ${edges.length} 邊)`);

      return {
        success: true,
        data: this.graph,
        metadata: {
          timestamp: new Date(),
          processingTime,
          version: '1.0.0'
        }
      };

    } catch (error) {
      console.error('知識圖譜構建錯誤:', error);
      return {
        success: false,
        metadata: {
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
          version: '1.0.0'
        },
        error: {
          code: 'KNOWLEDGE_GRAPH_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          source: 'knowledge-graph'
        }
      };
    }
  }

  /**
   * 圖查詢接口
   */
  async queryGraph(
    queryType: 'findPath' | 'getNeighbors' | 'searchNodes' | 'getClusters' | 'getStatistics',
    params: any
  ): Promise<GraphQueryResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();

    try {
      console.log(`🔍 執行圖查詢: ${queryType}`);

      let result: any = {};

      switch (queryType) {
        case 'findPath':
          result = this.findPath(params.from, params.to, params.maxDepth || 5);
          break;
        case 'getNeighbors':
          result = this.getNeighbors(params.nodeId, params.depth || 1);
          break;
        case 'searchNodes':
          result = this.searchNodes(params.query, params.nodeType);
          break;
        case 'getClusters':
          result = { clusters: this.graph.clusters || [] };
          break;
        case 'getStatistics':
          result = this.calculateGraphStatistics();
          break;
        default:
          throw new Error(`Unknown query type: ${queryType}`);
      }

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
          queryType
        }
      };

    } catch (error) {
      console.error('圖查詢錯誤:', error);
      return {
        success: false,
        metadata: {
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
          queryType
        },
        error: {
          code: 'GRAPH_QUERY_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * 獲取當前圖
   */
  getGraph(): KnowledgeGraph {
    return this.graph;
  }

  // ===== 私有方法 =====

  /**
   * 提取所有實體
   */
  private async extractAllEntities(sources: any[]): Promise<any[]> {
    const allEntities = [];

    for (const source of sources) {
      // 如果已有實體數據，直接使用
      if (source.entities && source.entities.length > 0) {
        allEntities.push(...source.entities.map((entity: any) => ({
          ...entity,
          source: source.source
        })));
        continue;
      }

      // 否則從內容中提取
      const entities = this.extractEntitiesFromText(source.content, source.source);
      allEntities.push(...entities);
    }

    console.log(`🔍 從 ${sources.length} 個來源提取了 ${allEntities.length} 個實體`);
    return allEntities;
  }

  /**
   * 從文本提取實體
   */
  private extractEntitiesFromText(content: string, source: string): any[] {
    const entities = [];

    // 人名識別 (簡化版)
    const personPattern = /([A-Z][a-z]+\s+[A-Z][a-z]+|[\u4e00-\u9fa5]{2,4}(?:教授|博士|先生|女士|院士))/g;
    let match;
    while ((match = personPattern.exec(content)) !== null) {
      entities.push({
        name: match[1].replace(/(教授|博士|先生|女士|院士)$/, ''),
        type: 'Person',
        confidence: 0.8,
        source,
        context: this.getContext(content, match.index, 100)
      });
    }

    // 機構識別
    const orgPattern = /([\u4e00-\u9fa5]{2,}(?:大學|學院|研究所|公司|企業|中心|實驗室)|[A-Z][a-zA-Z\s]{3,}(?:University|Institute|Laboratory|Company|Corporation))/g;
    while ((match = orgPattern.exec(content)) !== null) {
      entities.push({
        name: match[1],
        type: 'Organization',
        confidence: 0.7,
        source,
        context: this.getContext(content, match.index, 100)
      });
    }

    // 概念和技術術語
    const conceptPattern = /([A-Z][a-z]*(?:\s+[A-Z][a-z]*){1,3}|[\u4e00-\u9fa5]{3,8}(?:技術|方法|理論|模型|算法|系統))/g;
    while ((match = conceptPattern.exec(content)) !== null) {
      entities.push({
        name: match[1],
        type: this.classifyConceptType(match[1]),
        confidence: 0.6,
        source,
        context: this.getContext(content, match.index, 80)
      });
    }

    // 地點識別
    const locationPattern = /([\u4e00-\u9fa5]{2,}(?:市|省|國|縣|區)|[A-Z][a-zA-Z\s]{3,}(?:City|State|Country))/g;
    while ((match = locationPattern.exec(content)) !== null) {
      entities.push({
        name: match[1],
        type: 'Location',
        confidence: 0.5,
        source,
        context: this.getContext(content, match.index, 60)
      });
    }

    return this.filterAndRankEntities(entities);
  }

  /**
   * 實體融合
   */
  private async mergeEntities(entities: any[]): Promise<any[]> {
    const merged = [];
    const processed = new Set();

    for (const entity of entities) {
      if (processed.has(entity.name)) continue;

      // 找相似實體
      const similar = entities.filter(e => 
        e.name !== entity.name &&
        !processed.has(e.name) &&
        this.areEntitiesSimilar(entity, e)
      );

      if (similar.length > 0) {
        const mergedEntity = this.mergeEntityGroup([entity, ...similar]);
        merged.push(mergedEntity);
        processed.add(entity.name);
        similar.forEach(e => processed.add(e.name));
      } else {
        merged.push(this.enhanceEntity(entity));
        processed.add(entity.name);
      }
    }

    console.log(`🔗 實體融合完成: ${entities.length} → ${merged.length} 個實體`);
    return merged;
  }

  /**
   * 關係抽取
   */
  private async extractRelationships(sources: any[], entities: any[]): Promise<any[]> {
    const relationships = [];

    // 基於共現的關係抽取
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const entity1 = entities[i];
        const entity2 = entities[j];

        const cooccurrences = this.findCooccurrences(entity1, entity2, sources);
        
        if (cooccurrences.length > 0) {
          const relationship = this.inferRelationship(entity1, entity2, cooccurrences);
          if (relationship) {
            relationships.push(relationship);
          }
        }
      }
    }

    // 基於模式的關係抽取
    for (const source of sources) {
      const patternRelations = this.extractPatternBasedRelations(source.content, entities);
      relationships.push(...patternRelations);
    }

    console.log(`⚡ 關係抽取完成: 識別了 ${relationships.length} 個關係`);
    return this.filterAndRankRelationships(relationships);
  }

  /**
   * 創建節點
   */
  private createNodes(entities: any[]): KnowledgeNode[] {
    return entities.map((entity: any) => ({
      id: this.generateNodeId(entity.name),
      label: entity.name,
      type: entity.type,
      properties: {
        name: entity.name,
        description: entity.description || '',
        aliases: entity.aliases || [],
        confidence: entity.confidence,
        sources: entity.sources || [entity.source],
        importance: entity.importance || this.calculateNodeImportance(entity),
        attributes: entity.attributes || {}
      }
    }));
  }

  /**
   * 創建邊
   */
  private createEdges(relationships: any[]): KnowledgeEdge[] {
    return relationships.map(rel => ({
      id: this.generateEdgeId(rel.source, rel.target),
      source: this.generateNodeId(rel.source),
      target: this.generateNodeId(rel.target),
      relationship: rel.relationship,
      type: this.classifyRelationType(rel.relationship),
      properties: {
        weight: rel.weight || 1.0,
        confidence: rel.confidence,
        sources: rel.sources || [],
        evidence: rel.evidence || [],
        temporal: rel.temporal
      }
    }));
  }

  /**
   * 檢測集群
   */
  private detectClusters(nodes: KnowledgeNode[], edges: KnowledgeEdge[]): any[] {
    // 簡化的集群檢測 - 基於節點類型
    const clusters = new Map();

    nodes.forEach(node => {
      const type = node.type;
      if (!clusters.has(type)) {
        clusters.set(type, []);
      }
      clusters.get(type).push(node.id);
    });

    return Array.from(clusters.entries()).map(([type, nodeIds]) => ({
      id: `cluster_${type}`,
      name: `${type} 集群`,
      nodes: nodeIds,
      centrality: this.calculateClusterCentrality(nodeIds, edges)
    }));
  }

  /**
   * 尋找重要路徑
   */
  private findImportantPaths(nodes: KnowledgeNode[], edges: KnowledgeEdge[]): any[] {
    const paths = [];
    const importantNodes = nodes
      .filter(n => n.properties.importance > 0.7)
      .slice(0, 5);

    for (let i = 0; i < importantNodes.length; i++) {
      for (let j = i + 1; j < importantNodes.length; j++) {
        const path = this.findShortestPath(
          importantNodes[i].id,
          importantNodes[j].id,
          edges
        );
        
        if (path && path.length <= 4) {
          paths.push({
            from: importantNodes[i].id,
            to: importantNodes[j].id,
            path,
            weight: this.calculatePathWeight(path, edges)
          });
        }
      }
    }

    return paths.slice(0, 10); // 限制數量
  }

  /**
   * 計算佈局
   */
  private calculateLayout(nodes: KnowledgeNode[], edges: KnowledgeEdge[]): any[] {
    // 簡化的力導向佈局
    const positions: any[] = [];
    const centerX = 0;
    const centerY = 0;
    const radius = 200;

    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI;
      const distance = radius * (1 + Math.random() * 0.5);
      
      positions.push({
        x: centerX + distance * Math.cos(angle),
        y: centerY + distance * Math.sin(angle)
      });
    });

    return positions;
  }

  // ===== 查詢方法 =====

  private findPath(fromId: string, toId: string, maxDepth: number): any {
    const path = this.findShortestPath(fromId, toId, this.graph.edges, maxDepth);
    
    if (!path) {
      return { path: null, message: 'No path found' };
    }

    const pathNodes = path.map(nodeId => 
      this.graph.nodes.find(n => n.id === nodeId)
    ).filter(Boolean);

    const pathEdges = [];
    for (let i = 0; i < path.length - 1; i++) {
      const edge = this.graph.edges.find(e => 
        (e.source === path[i] && e.target === path[i + 1]) ||
        (e.source === path[i + 1] && e.target === path[i])
      );
      if (edge) pathEdges.push(edge);
    }

    return {
      path,
      nodes: pathNodes,
      edges: pathEdges,
      length: path.length - 1,
      weight: this.calculatePathWeight(path, this.graph.edges)
    };
  }

  private getNeighbors(nodeId: string, depth: number): any {
    const visited = new Set<string>();
    const result: { nodes: KnowledgeNode[], edges: KnowledgeEdge[] } = { nodes: [], edges: [] };
    
    const explore = (currentId: string, currentDepth: number) => {
      if (currentDepth > depth || visited.has(currentId)) return;
      visited.add(currentId);

      const node = this.graph.nodes.find(n => n.id === currentId);
      if (node && currentId !== nodeId) {
        result.nodes.push(node);
      }

      const connectedEdges = this.graph.edges.filter(e => 
        e.source === currentId || e.target === currentId
      );

      for (const edge of connectedEdges) {
        result.edges.push(edge);
        const nextId = edge.source === currentId ? edge.target : edge.source;
        explore(nextId, currentDepth + 1);
      }
    };

    explore(nodeId, 0);
    
    // 去重
    result.nodes = [...new Map(result.nodes.map(n => [n.id, n])).values()];
    result.edges = [...new Map(result.edges.map(e => [e.id, e])).values()];

    return result;
  }

  private searchNodes(query: string, nodeType?: string): any {
    const lowerQuery = query.toLowerCase();
    
    let filteredNodes = this.graph.nodes.filter(node => 
      node.label.toLowerCase().includes(lowerQuery) ||
      node.properties.name.toLowerCase().includes(lowerQuery) ||
      node.properties.aliases.some(alias => alias.toLowerCase().includes(lowerQuery))
    );

    if (nodeType) {
      filteredNodes = filteredNodes.filter(node => node.type === nodeType);
    }

    // 按相關性排序
    filteredNodes.sort((a, b) => {
      const aScore = this.calculateSearchScore(a, query);
      const bScore = this.calculateSearchScore(b, query);
      return bScore - aScore;
    });

    return {
      nodes: filteredNodes.slice(0, 20),
      totalCount: filteredNodes.length
    };
  }

  private calculateGraphStatistics(): any {
    const nodeCount = this.graph.nodes.length;
    const edgeCount = this.graph.edges.length;
    
    // 計算度分布
    const degrees = new Map();
    this.graph.nodes.forEach(node => degrees.set(node.id, 0));
    
    this.graph.edges.forEach(edge => {
      degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
      degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
    });

    const degreeValues = Array.from(degrees.values());
    const avgDegree = degreeValues.reduce((sum, d) => sum + d, 0) / nodeCount;
    const maxDegree = Math.max(...degreeValues);

    // 中心節點
    const centralNodes = this.graph.nodes
      .map(node => ({
        id: node.id,
        degree: degrees.get(node.id) || 0
      }))
      .sort((a, b) => b.degree - a.degree)
      .slice(0, 5)
      .map(item => item.id);

    return {
      nodeCount,
      edgeCount,
      avgDegree,
      maxDegree,
      centralNodes,
      statistics: {
        density: nodeCount > 1 ? (2 * edgeCount) / (nodeCount * (nodeCount - 1)) : 0,
        components: this.countConnectedComponents(),
        avgClusteringCoefficient: this.calculateClusteringCoefficient()
      }
    };
  }

  // ===== 輔助方法 =====

  private getContext(text: string, index: number, length: number): string {
    const start = Math.max(0, index - length / 2);
    const end = Math.min(text.length, index + length / 2);
    return text.slice(start, end);
  }

  private classifyConceptType(concept: string): string {
    if (concept.includes('技術') || concept.includes('Technology')) return 'Technology';
    if (concept.includes('理論') || concept.includes('Theory')) return 'Concept';
    if (concept.includes('算法') || concept.includes('Algorithm')) return 'Technology';
    if (concept.includes('模型') || concept.includes('Model')) return 'Concept';
    return 'Concept';
  }

  private filterAndRankEntities(entities: any[]): any[] {
    // 過濾和排序實體
    return entities
      .filter(entity => 
        entity.name.length > 1 && 
        !this.isCommonWord(entity.name) &&
        entity.confidence > 0.3
      )
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 50); // 限制數量
  }

  private areEntitiesSimilar(entity1: any, entity2: any): boolean {
    // 檢查名稱相似性
    const similarity = this.calculateStringSimilarity(entity1.name, entity2.name);
    return similarity > 0.8 && entity1.type === entity2.type;
  }

  private mergeEntityGroup(entities: any[]): any {
    const main = entities[0];
    const allSources = [...new Set(entities.flatMap(e => e.sources || [e.source]))];
    const aliases = [...new Set(entities.map(e => e.name))];
    
    return {
      ...main,
      aliases,
      sources: allSources,
      confidence: entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length,
      importance: Math.max(...entities.map(e => e.importance || 0.5))
    };
  }

  private enhanceEntity(entity: any): any {
    return {
      ...entity,
      aliases: [entity.name],
      sources: entity.sources || [entity.source],
      importance: entity.importance || this.calculateNodeImportance(entity)
    };
  }

  private findCooccurrences(entity1: any, entity2: any, sources: any[]): any[] {
    const cooccurrences = [];
    
    for (const source of sources) {
      const content = source.content.toLowerCase();
      const name1 = entity1.name.toLowerCase();
      const name2 = entity2.name.toLowerCase();
      
      if (content.includes(name1) && content.includes(name2)) {
        const distance = this.calculateTextDistance(content, name1, name2);
        if (distance < 200) { // 在200字符內
          cooccurrences.push({
            source: source.source,
            distance,
            context: this.extractCooccurrenceContext(content, name1, name2)
          });
        }
      }
    }
    
    return cooccurrences;
  }

  private inferRelationship(entity1: any, entity2: any, cooccurrences: any[]): any {
    if (cooccurrences.length === 0) return null;

    // 基於實體類型推斷關係
    const relType = this.inferRelationshipType(entity1.type, entity2.type);
    const avgDistance = cooccurrences.reduce((sum, c) => sum + c.distance, 0) / cooccurrences.length;
    const confidence = Math.max(0.3, 1 - avgDistance / 200);

    return {
      source: entity1.name,
      target: entity2.name,
      relationship: relType,
      confidence,
      weight: confidence,
      sources: cooccurrences.map(c => c.source),
      evidence: cooccurrences.map(c => c.context)
    };
  }

  private extractPatternBasedRelations(content: string, entities: any[]): any[] {
    const relations = [];
    
    // 定義關係模式
    const patterns = [
      { pattern: /(.+?)(?:發明|創造|提出)了?(.+?)/, type: 'CREATED' },
      { pattern: /(.+?)(?:影響|啟發)了?(.+?)/, type: 'INFLUENCED' },
      { pattern: /(.+?)(?:屬於|歸屬於)(.+?)/, type: 'BELONGS_TO' },
      { pattern: /(.+?)(?:使用|採用|運用)了?(.+?)/, type: 'USES' }
    ];

    for (const { pattern, type } of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const entity1Name = match[1].trim();
        const entity2Name = match[2].trim();
        
        const entity1 = entities.find(e => content.includes(e.name) && e.name.includes(entity1Name));
        const entity2 = entities.find(e => content.includes(e.name) && e.name.includes(entity2Name));
        
        if (entity1 && entity2) {
          relations.push({
            source: entity1.name,
            target: entity2.name,
            relationship: type,
            confidence: 0.6,
            weight: 0.6,
            sources: ['pattern-based'],
            evidence: [match[0]]
          });
        }
      }
    }

    return relations;
  }

  private filterAndRankRelationships(relationships: any[]): any[] {
    return relationships
      .filter(rel => rel.confidence > 0.2)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 100); // 限制數量
  }

  private generateNodeId(name: string): string {
    return `node_${name.replace(/[^\w\u4e00-\u9fa5]/g, '_').toLowerCase()}`;
  }

  private generateEdgeId(source: string, target: string): string {
    const sourceId = this.generateNodeId(source);
    const targetId = this.generateNodeId(target);
    return `edge_${sourceId}_${targetId}`;
  }

  private calculateNodeImportance(entity: any): number {
    let importance = 0.5;
    
    // 基於實體類型
    if (entity.type === 'Person') importance += 0.2;
    if (entity.type === 'Technology') importance += 0.15;
    
    // 基於信心度
    importance += entity.confidence * 0.2;
    
    // 基於來源數量
    const sourceCount = entity.sources ? entity.sources.length : 1;
    importance += Math.min(0.1, sourceCount * 0.03);
    
    return Math.min(1.0, importance);
  }

  private classifyRelationType(relationship: string): any {
    const lowerRel = relationship.toLowerCase();
    
    if (lowerRel.includes('創') || lowerRel.includes('發明') || lowerRel.includes('create')) return 'CREATED';
    if (lowerRel.includes('影響') || lowerRel.includes('influence')) return 'INFLUENCED';
    if (lowerRel.includes('屬於') || lowerRel.includes('belong')) return 'BELONGS_TO';
    if (lowerRel.includes('使用') || lowerRel.includes('use')) return 'USES';
    if (lowerRel.includes('部分') || lowerRel.includes('part')) return 'PART_OF';
    if (lowerRel.includes('發現') || lowerRel.includes('discover')) return 'DISCOVERED';
    if (lowerRel.includes('導致') || lowerRel.includes('cause')) return 'CAUSED';
    
    return 'RELATED_TO';
  }

  private calculateClusterCentrality(nodeIds: string[], edges: KnowledgeEdge[]): number {
    const clusterEdges = edges.filter(e => 
      nodeIds.includes(e.source) && nodeIds.includes(e.target)
    );
    
    return nodeIds.length > 1 ? clusterEdges.length / (nodeIds.length * (nodeIds.length - 1) / 2) : 0;
  }

  private findShortestPath(fromId: string, toId: string, edges: KnowledgeEdge[], maxDepth: number = 5): string[] | null {
    if (fromId === toId) return [fromId];

    const queue = [[fromId]];
    const visited = new Set([fromId]);

    while (queue.length > 0) {
      const path = queue.shift()!;
      const currentNode = path[path.length - 1];

      if (path.length > maxDepth) continue;

      const neighbors = edges
        .filter(e => e.source === currentNode || e.target === currentNode)
        .map(e => e.source === currentNode ? e.target : e.source);

      for (const neighbor of neighbors) {
        if (neighbor === toId) {
          return [...path, neighbor];
        }

        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      }
    }

    return null;
  }

  private calculatePathWeight(path: string[], edges: KnowledgeEdge[]): number {
    let totalWeight = 0;
    
    for (let i = 0; i < path.length - 1; i++) {
      const edge = edges.find(e => 
        (e.source === path[i] && e.target === path[i + 1]) ||
        (e.source === path[i + 1] && e.target === path[i])
      );
      
      if (edge) {
        totalWeight += edge.properties.weight;
      }
    }

    return totalWeight / Math.max(1, path.length - 1);
  }

  private calculateGraphConfidence(nodes: KnowledgeNode[], edges: KnowledgeEdge[]): number {
    const nodeConfidence = nodes.reduce((sum, n) => sum + n.properties.confidence, 0) / nodes.length;
    const edgeConfidence = edges.reduce((sum, e) => sum + e.properties.confidence, 0) / Math.max(1, edges.length);
    
    return (nodeConfidence + edgeConfidence) / 2;
  }

  private categorizeNodes(nodes: KnowledgeNode[]): Record<string, number> {
    const categories: Record<string, number> = {};
    
    nodes.forEach(node => {
      categories[node.type] = (categories[node.type] || 0) + 1;
    });

    return categories;
  }

  private calculateSearchScore(node: KnowledgeNode, query: string): number {
    const lowerQuery = query.toLowerCase();
    const lowerLabel = node.label.toLowerCase();
    
    let score = 0;
    
    // 完全匹配
    if (lowerLabel === lowerQuery) score += 10;
    
    // 開頭匹配
    if (lowerLabel.startsWith(lowerQuery)) score += 5;
    
    // 包含匹配
    if (lowerLabel.includes(lowerQuery)) score += 2;
    
    // 別名匹配
    for (const alias of node.properties.aliases) {
      if (alias.toLowerCase().includes(lowerQuery)) score += 1;
    }
    
    // 重要性加權
    score *= node.properties.importance;
    
    return score;
  }

  private countConnectedComponents(): number {
    // 簡化的連通分量計算
    const visited = new Set<string>();
    let components = 0;

    for (const node of this.graph.nodes) {
      if (!visited.has(node.id)) {
        this.dfsComponent(node.id, visited);
        components++;
      }
    }

    return components;
  }

  private dfsComponent(nodeId: string, visited: Set<string>): void {
    visited.add(nodeId);
    
    const neighbors = this.graph.edges
      .filter(e => e.source === nodeId || e.target === nodeId)
      .map(e => e.source === nodeId ? e.target : e.source);

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        this.dfsComponent(neighbor, visited);
      }
    }
  }

  private calculateClusteringCoefficient(): number {
    // 簡化的聚集係數計算
    let totalCoefficient = 0;
    let nodeCount = 0;

    for (const node of this.graph.nodes) {
      const neighbors = this.getDirectNeighbors(node.id);
      
      if (neighbors.length >= 2) {
        const possibleEdges = neighbors.length * (neighbors.length - 1) / 2;
        const actualEdges = this.countEdgesBetween(neighbors);
        totalCoefficient += actualEdges / possibleEdges;
        nodeCount++;
      }
    }

    return nodeCount > 0 ? totalCoefficient / nodeCount : 0;
  }

  private getDirectNeighbors(nodeId: string): string[] {
    return this.graph.edges
      .filter(e => e.source === nodeId || e.target === nodeId)
      .map(e => e.source === nodeId ? e.target : e.source);
  }

  private countEdgesBetween(nodeIds: string[]): number {
    let count = 0;
    
    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const hasEdge = this.graph.edges.some(e => 
          (e.source === nodeIds[i] && e.target === nodeIds[j]) ||
          (e.source === nodeIds[j] && e.target === nodeIds[i])
        );
        
        if (hasEdge) count++;
      }
    }

    return count;
  }

  private isCommonWord(word: string): boolean {
    const commonWords = ['的', '了', '是', '在', '有', '和', '與', '或', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    return commonWords.includes(word.toLowerCase()) || word.length < 2;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // 簡化的字符串相似度計算
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.calculateLevenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private calculateLevenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private calculateTextDistance(content: string, name1: string, name2: string): number {
    const index1 = content.indexOf(name1);
    const index2 = content.indexOf(name2);
    
    if (index1 === -1 || index2 === -1) return Infinity;
    
    return Math.abs(index1 - index2);
  }

  private extractCooccurrenceContext(content: string, name1: string, name2: string): string {
    const index1 = content.indexOf(name1);
    const index2 = content.indexOf(name2);
    
    const start = Math.min(index1, index2);
    const end = Math.max(index1 + name1.length, index2 + name2.length);
    
    const contextStart = Math.max(0, start - 50);
    const contextEnd = Math.min(content.length, end + 50);
    
    return content.slice(contextStart, contextEnd);
  }

  private inferRelationshipType(type1: string, type2: string): string {
    // 基於實體類型推斷關係類型
    if (type1 === 'Person' && type2 === 'Technology') return '開發';
    if (type1 === 'Person' && type2 === 'Organization') return '隸屬於';
    if (type1 === 'Technology' && type2 === 'Concept') return '實現';
    if (type1 === 'Concept' && type2 === 'Concept') return '相關';
    if (type1 === 'Organization' && type2 === 'Technology') return '研發';
    
    return '相關';
  }

  async terminate(): Promise<void> {
    console.log('🗺️ Terminating Knowledge Graph Service...');
    this.isInitialized = false;
    console.log('✅ Knowledge Graph Service terminated');
  }
}