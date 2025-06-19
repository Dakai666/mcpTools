/**
 * 統一學術知識整合系統 - 核心類型定義
 */

// 知識深度等級
export type KnowledgeDepth = 'basic' | 'professional' | 'academic';

// 內容用途
export type ContentPurpose = 'conversation' | 'presentation' | 'podcast' | 'report' | 'research';

// 輸出格式
export type OutputFormat = 'summary' | 'outline' | 'script' | 'cards' | 'report';

// 知識來源
export type KnowledgeSource = 'wikipedia' | 'arxiv' | 'semanticscholar' | 'hybrid' | 'arxiv_v2' | 'pdf_downloader' | 'pdf_extractor' | 'wikipedia_v2' | 'semanticscholar_v2';

// 統一知識請求接口
export interface KnowledgeRequest {
  topic: string;
  depth: KnowledgeDepth;
  purpose: ContentPurpose;
  timeLimit: number; // 分鐘
  languages: string[];
  format: OutputFormat;
  sources?: KnowledgeSource[];
}

// 統一知識響應接口
export interface KnowledgeResponse {
  topic: string;
  depth: KnowledgeDepth;
  content: ProcessedContent;
  metadata: ResponseMetadata;
  sources: SourceAttribution[];
  processingTime: number;
}

// 處理後的內容
export interface ProcessedContent {
  summary: string;
  keyPoints: string[];
  detailedSections: ContentSection[];
  relatedTopics: string[];
  suggestedReading: Recommendation[];
}

// 內容章節
export interface ContentSection {
  title: string;
  content: string;
  importance: number; // 1-10
  source: KnowledgeSource;
  citations: Citation[];
}

// 推薦閱讀
export interface Recommendation {
  title: string;
  type: 'paper' | 'article' | 'book' | 'webpage';
  url?: string;
  relevance: number; // 1-10
  difficulty: KnowledgeDepth;
}

// 引用信息
export interface Citation {
  title: string;
  authors: string[];
  year: number;
  source: string;
  url?: string;
  doi?: string;
}

// 響應元數據
export interface ResponseMetadata {
  generatedAt: Date;
  version: string;
  confidence: number; // 0-100
  completeness: number; // 0-100
  sourcesUsed: KnowledgeSource[];
  estimatedReadingTime: number; // 分鐘
}

// 來源歸屬
export interface SourceAttribution {
  source: KnowledgeSource;
  contribution: number; // 百分比
  quality: number; // 1-10
  recency: number; // 天數
}

// ===== arXiv 相關類型 =====

export interface ArxivPaper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  categories: string[];
  publishedDate: Date;
  updatedDate?: Date;
  pdfUrl: string;
  citation: Citation;
}

export interface ArxivSearchFilters {
  maxResults?: number;
  startDate?: Date;
  endDate?: Date;
  categories?: string[];
  sortBy?: 'relevance' | 'lastUpdatedDate' | 'submittedDate';
}

export interface DeepPaperAnalysis {
  summary: string;
  methodology: string;
  keyFindings: string[];
  limitations: string[];
  futureWork: string[];
  significance: number; // 1-10
  complexity: number; // 1-10
}

// ===== Semantic Scholar 相關類型 =====

export interface ScholarPaper {
  paperId: string;
  title: string;
  authors: ScholarAuthor[];
  abstract?: string;
  year?: number;
  citationCount: number;
  referenceCount: number;
  influentialCitationCount: number;
  fieldsOfStudy: string[];
  url?: string;
  venue?: string;
  doi?: string;
  // v2.0 新增字段
  externalIds?: {
    ArXiv?: string;
    DOI?: string;
    MAG?: string;
    PubMed?: string;
    [key: string]: string | undefined;
  };
}

export interface ScholarAuthor {
  authorId?: string;
  name: string;
  affiliation?: string;
  paperCount?: number;
  citationCount?: number;
  hIndex?: number;
}

export interface CitationNetwork {
  centralPaper: ScholarPaper;
  citations: ScholarPaper[];
  references: ScholarPaper[];
  influentialCitations: ScholarPaper[];
  citationDepth: number;
  networkSize: number;
}

export interface ResearchTrend {
  field: string;
  trendDirection: 'rising' | 'stable' | 'declining';
  hotTopics: string[];
  emergingAuthors: ScholarAuthor[];
  keyPapers: ScholarPaper[];
  timespan: {
    start: Date;
    end: Date;
  };
}

// ===== Wikipedia 相關類型 =====

export interface WikiContent {
  title: string;
  summary: string;
  fullContent: string;
  sections: WikiSection[];
  infobox: Record<string, string>;
  categories: string[];
  relatedTopics: string[];
  lastModified: Date;
  languages: string[];
}

export interface WikiSection {
  title: string;
  content: string;
  level: number;
  anchor: string;
}

export interface TopicNetwork {
  centralTopic: string;
  relatedTopics: RelatedTopic[];
  connections: TopicConnection[];
  networkDepth: number;
}

export interface RelatedTopic {
  title: string;
  relevance: number; // 1-10
  category: string;
  description: string;
}

export interface TopicConnection {
  from: string;
  to: string;
  strength: number; // 1-10
  type: 'semantic' | 'categorical' | 'historical' | 'causal';
}

export interface StructuredFacts {
  topic: string;
  facts: Fact[];
  statistics: Statistic[];
  timeline: TimelineEvent[];
  keyFigures: KeyFigure[];
}

export interface Fact {
  statement: string;
  confidence: number; // 1-10
  source: string;
  category: string;
}

export interface Statistic {
  metric: string;
  value: string | number;
  unit?: string;
  date?: Date;
  source: string;
}

export interface TimelineEvent {
  date: Date;
  event: string;
  significance: number; // 1-10
  description?: string;
}

export interface KeyFigure {
  name: string;
  role: string;
  contribution: string;
  years?: string;
}

// ===== 跨文化和多語言支持 =====

export interface PerspectiveMap {
  topic: string;
  perspectives: CulturalPerspective[];
  commonElements: string[];
  differences: string[];
  synthesis: string;
}

export interface CulturalPerspective {
  language: string;
  culture: string;
  viewpoint: string;
  uniqueAspects: string[];
  culturalContext: string;
}

// ===== 內容生成相關類型 =====

export interface PodcastScript {
  title: string;
  duration: number; // 分鐘
  segments: PodcastSegment[];
  transitions: string[];
  callToActions: string[];
  metadata: PodcastMetadata;
}

export interface PodcastSegment {
  type: 'intro' | 'main' | 'deep-dive' | 'summary' | 'outro';
  duration: number; // 分鐘
  script: string;
  speakingNotes: string[];
  sources: string[];
}

export interface PodcastMetadata {
  targetAudience: string;
  difficulty: KnowledgeDepth;
  topics: string[];
  keywords: string[];
  suggestedMusic?: string;
}

export interface ResearchReport {
  title: string;
  abstract: string;
  sections: ReportSection[];
  bibliography: Citation[];
  appendices: Appendix[];
  metadata: ReportMetadata;
}

export interface ReportSection {
  heading: string;
  level: number;
  content: string;
  subsections: ReportSection[];
  figures: Figure[];
  tables: Table[];
}

export interface ReportMetadata {
  authors: string[];
  institution?: string;
  date: Date;
  version: string;
  wordCount: number;
  pageCount: number;
}

export interface Figure {
  id: string;
  caption: string;
  description: string;
  source: string;
}

export interface Table {
  id: string;
  caption: string;
  headers: string[];
  rows: string[][];
  source: string;
}

export interface Appendix {
  title: string;
  content: string;
  type: 'data' | 'methodology' | 'supplementary';
}

export interface KnowledgeCard {
  id: string;
  topic: string;
  category: string;
  summary: string;
  keyPoints: string[];
  difficulty: KnowledgeDepth;
  estimatedReadingTime: number;
  tags: string[];
  relatedCards: string[];
  sources: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ===== 錯誤處理 =====

export interface KnowledgeError {
  code: string;
  message: string;
  source?: KnowledgeSource;
  retryable: boolean;
  details?: Record<string, any>;
}

// ===== API 響應統一格式 =====

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: KnowledgeError;
  metadata: {
    timestamp: Date;
    processingTime: number;
    version: string;
    [key: string]: any; // 允許額外的元數據字段
  };
}