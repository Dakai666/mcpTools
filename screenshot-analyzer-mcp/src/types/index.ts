export interface OCRResult {
  text: string;
  confidence: number;
  words: WordData[];
  paragraphs: ParagraphData[];
  blocks: BlockData[];
}

export interface WordData {
  text: string;
  confidence: number;
  bbox: BoundingBox;
}

export interface ParagraphData {
  text: string;
  confidence: number;
  bbox: BoundingBox;
  words: WordData[];
}

export interface BlockData {
  text: string;
  confidence: number;
  bbox: BoundingBox;
  paragraphs: ParagraphData[];
}

export interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface ImageProcessOptions {
  enhanceContrast?: boolean;
  removeNoise?: boolean;
  deskew?: boolean;
  resize?: {
    width?: number;
    height?: number;
    maintainAspectRatio?: boolean;
  };
}

export interface AnalysisOptions {
  languages?: string[];
  imageProcessing?: ImageProcessOptions;
  extractStructure?: boolean;
  detectTables?: boolean;
  confidenceThreshold?: number;
}

export interface ScreenshotAnalysis {
  ocr: OCRResult;
  metadata: ImageMetadata;
  analysis: ContentAnalysis;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  hasAlpha: boolean;
}

export interface ContentAnalysis {
  textBlocks: TextBlock[];
  possibleTables: TableStructure[];
  detectedLanguages: string[];
  summary: string;
  processingDetails?: {
    enginesUsed: string[];
    processingTime: number;
    imageStats?: {
      width: number;
      height: number;
      fileSize: number;
    };
    tablesDetected: number;
  };
}

export interface TextBlock {
  type: 'title' | 'paragraph' | 'list' | 'code' | 'other';
  text: string;
  bbox: BoundingBox;
  confidence: number;
}

export interface TableStructure {
  rows: number;
  columns: number;
  bbox: BoundingBox;
  cells: TableCell[][];
}

export interface TableCell {
  text: string;
  bbox: BoundingBox;
  rowspan: number;
  colspan: number;
}