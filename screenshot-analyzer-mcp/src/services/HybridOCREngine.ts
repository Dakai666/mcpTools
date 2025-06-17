import { AdaptiveOCREngine } from './AdaptiveOCREngine.js';
import { PaddleOCREngine } from './PaddleOCREngine.js';
import { TableDetectionEngine, TableDetectionResult } from './TableDetectionEngine.js';
import { 
  OCRResult, 
  ImageProcessOptions, 
  AnalysisOptions,
  WordData,
  ParagraphData,
  BlockData
} from '../types/index.js';
import fs from 'fs/promises';

export interface HybridOCRResult extends OCRResult {
  tableResults?: TableDetectionResult;
  engineUsed: string[];
  processingTime: number;
  imageStats?: {
    width: number;
    height: number;
    fileSize: number;
  };
}

export class HybridOCREngine {
  private adaptiveEngine: AdaptiveOCREngine;
  private paddleEngine: PaddleOCREngine;
  private tableEngine: TableDetectionEngine;
  private isInitialized = false;

  constructor() {
    this.adaptiveEngine = new AdaptiveOCREngine();
    this.paddleEngine = new PaddleOCREngine();
    this.tableEngine = new TableDetectionEngine();
  }

  async initialize(languages: string[] = ['chi_tra', 'eng']): Promise<void> {
    if (this.isInitialized) return;

    const startTime = Date.now();
    console.log('Initializing Hybrid OCR Engine...');

    try {
      // 並行初始化所有引擎
      const initPromises = [
        this.adaptiveEngine.initialize(languages),
        this.initializePaddleOCR(),
        this.tableEngine.initialize()
      ];

      await Promise.allSettled(initPromises);

      this.isInitialized = true;
      const initTime = Date.now() - startTime;
      console.log(`Hybrid OCR Engine initialized in ${initTime}ms`);
    } catch (error) {
      console.error('Failed to initialize Hybrid OCR Engine:', error);
      throw new Error('Hybrid OCR initialization failed: ' + error);
    }
  }

  private async initializePaddleOCR(): Promise<void> {
    try {
      await this.paddleEngine.initialize();
      console.log('PaddleOCR engine available');
    } catch (error) {
      console.warn('PaddleOCR not available, falling back to Tesseract only:', (error as Error).message);
    }
  }

  async processImage(
    imagePath: string,
    options: AnalysisOptions = {}
  ): Promise<HybridOCRResult> {
    if (!this.isInitialized) {
      await this.initialize(options.languages);
    }

    const startTime = Date.now();
    const enginesUsed: string[] = [];

    try {
      // 獲取圖像統計信息
      const imageStats = await this.getImageStats(imagePath);
      console.log('Processing image:', imageStats);

      // 決定使用哪些引擎
      const strategy = this.selectProcessingStrategy(imageStats, options);
      console.log('Selected strategy:', strategy);

      let primaryResult: OCRResult | null = null;
      let secondaryResult: OCRResult | null = null;
      let tableResult: TableDetectionResult | null = null;

      // 執行 OCR 處理
      if (strategy.usePaddle) {
        try {
          primaryResult = await this.paddleEngine.recognizeText(imagePath, options);
          enginesUsed.push('PaddleOCR');
          console.log('PaddleOCR completed with confidence:', primaryResult.confidence);
        } catch (error) {
          console.warn('PaddleOCR failed, falling back to Tesseract:', (error as Error).message);
          strategy.useTesseract = true;
        }
      }

      if (strategy.useTesseract) {
        try {
          // 使用自適應預處理
          const processedImage = await this.adaptiveEngine.processImage(imagePath, {
            enhanceContrast: options.imageProcessing?.enhanceContrast,
            removeNoise: options.imageProcessing?.removeNoise
          });

          secondaryResult = await this.adaptiveEngine.recognizeText(processedImage, options);
          enginesUsed.push('Tesseract');
          console.log('Tesseract completed with confidence:', secondaryResult.confidence);
        } catch (error) {
          console.error('Tesseract processing failed:', error);
          if (!primaryResult) {
            throw new Error('All OCR engines failed');
          }
        }
      }

      // 表格檢測
      if (strategy.detectTables || options.detectTables) {
        try {
          tableResult = await this.tableEngine.detectTables(imagePath);
          enginesUsed.push('TableDetection');
          console.log('Table detection completed, found tables:', tableResult.totalTables);
        } catch (error) {
          console.warn('Table detection failed:', (error as Error).message);
        }
      }

      // 合併結果
      const finalResult = this.mergeResults(primaryResult, secondaryResult, strategy);
      
      const processingTime = Date.now() - startTime;
      console.log(`Processing completed in ${processingTime}ms`);

      return {
        ...finalResult,
        tableResults: tableResult || undefined,
        engineUsed: enginesUsed,
        processingTime,
        imageStats
      };

    } catch (error) {
      console.error('Hybrid OCR processing failed:', error);
      throw new Error('Hybrid OCR processing failed: ' + error);
    }
  }

  private async getImageStats(imagePath: string): Promise<{
    width: number;
    height: number;
    fileSize: number;
  }> {
    try {
      const stats = await fs.stat(imagePath);
      
      // 簡單的圖像尺寸檢測（實際應該用圖像庫）
      // 這裡只返回文件大小，寬高可以後續從處理結果中獲取
      return {
        width: 0,  // 將在處理過程中更新
        height: 0, // 將在處理過程中更新
        fileSize: stats.size
      };
    } catch (error) {
      console.warn('Failed to get image stats:', error);
      return { width: 0, height: 0, fileSize: 0 };
    }
  }

  private selectProcessingStrategy(
    imageStats: { width: number; height: number; fileSize: number },
    options: AnalysisOptions
  ): {
    usePaddle: boolean;
    useTesseract: boolean;
    detectTables: boolean;
    mergeStrategy: 'primary' | 'best_confidence' | 'hybrid';
  } {
    // 默認策略
    let strategy: {
      usePaddle: boolean;
      useTesseract: boolean;
      detectTables: boolean;
      mergeStrategy: 'primary' | 'best_confidence' | 'hybrid';
    } = {
      usePaddle: true,
      useTesseract: false,
      detectTables: false,
      mergeStrategy: 'primary'
    };

    // 根據語言選擇引擎
    const languages = options.languages || ['chi_tra', 'eng'];
    const hasChinese = languages.some(lang => 
      lang.includes('chi') || lang.includes('chinese') || lang === 'ch'
    );

    if (hasChinese) {
      // 中文文檔優先使用 PaddleOCR
      strategy.usePaddle = true;
      strategy.useTesseract = true; // 作為備份
      strategy.mergeStrategy = 'best_confidence';
    } else {
      // 英文文檔可以使用 Tesseract
      strategy.usePaddle = false;
      strategy.useTesseract = true;
      strategy.mergeStrategy = 'primary';
    }

    // 表格檢測策略
    if (options.detectTables || options.extractStructure) {
      strategy.detectTables = true;
    }

    // 大文件策略調整
    if (imageStats.fileSize > 5 * 1024 * 1024) { // 5MB
      console.log('Large image detected, optimizing strategy');
      strategy.useTesseract = false; // 大圖像只用一個引擎
    }

    return strategy;
  }

  private mergeResults(
    primary: OCRResult | null,
    secondary: OCRResult | null,
    strategy: { mergeStrategy: string }
  ): OCRResult {
    if (!primary && !secondary) {
      return {
        text: '',
        confidence: 0,
        words: [],
        paragraphs: [],
        blocks: []
      };
    }

    if (!primary) return secondary!;
    if (!secondary) return primary;

    switch (strategy.mergeStrategy) {
      case 'best_confidence':
        return primary.confidence >= secondary.confidence ? primary : secondary;
      
      case 'hybrid':
        return this.hybridMerge(primary, secondary);
      
      case 'primary':
      default:
        return primary;
    }
  }

  private hybridMerge(result1: OCRResult, result2: OCRResult): OCRResult {
    // 智能合併兩個 OCR 結果
    const mergedWords: WordData[] = [];
    const mergedParagraphs: ParagraphData[] = [];
    const mergedBlocks: BlockData[] = [];

    // 簡化版：選擇信心度更高的詞語
    const allWords = [...result1.words, ...result2.words];
    const wordMap = new Map<string, WordData>();

    allWords.forEach(word => {
      const key = `${Math.round(word.bbox.x0)}-${Math.round(word.bbox.y0)}`;
      const existing = wordMap.get(key);
      
      if (!existing || word.confidence > existing.confidence) {
        wordMap.set(key, word);
      }
    });

    mergedWords.push(...Array.from(wordMap.values()));

    // 重新組織段落和區塊
    const groupedWords = this.groupWordsByProximity(mergedWords);
    groupedWords.forEach((group, index) => {
      const paragraph: ParagraphData = {
        text: group.map(w => w.text).join(' '),
        confidence: group.reduce((sum, w) => sum + w.confidence, 0) / group.length,
        bbox: this.calculateGroupBbox(group.map(w => w.bbox)),
        words: group
      };
      mergedParagraphs.push(paragraph);
    });

    if (mergedParagraphs.length > 0) {
      const block: BlockData = {
        text: mergedParagraphs.map(p => p.text).join('\n'),
        confidence: mergedParagraphs.reduce((sum, p) => sum + p.confidence, 0) / mergedParagraphs.length,
        bbox: this.calculateGroupBbox(mergedParagraphs.map(p => p.bbox)),
        paragraphs: mergedParagraphs
      };
      mergedBlocks.push(block);
    }

    return {
      text: mergedWords.map(w => w.text).join(' '),
      confidence: mergedWords.reduce((sum, w) => sum + w.confidence, 0) / mergedWords.length,
      words: mergedWords,
      paragraphs: mergedParagraphs,
      blocks: mergedBlocks
    };
  }

  private groupWordsByProximity(words: WordData[]): WordData[][] {
    if (words.length === 0) return [];

    const groups: WordData[][] = [];
    const sortedWords = words.sort((a, b) => a.bbox.y0 - b.bbox.y0);
    
    let currentGroup: WordData[] = [sortedWords[0]];

    for (let i = 1; i < sortedWords.length; i++) {
      const prev = sortedWords[i - 1];
      const curr = sortedWords[i];
      
      const prevHeight = prev.bbox.y1 - prev.bbox.y0;
      const yDiff = Math.abs(curr.bbox.y0 - prev.bbox.y0);
      
      if (yDiff < prevHeight * 0.8) {
        currentGroup.push(curr);
      } else {
        groups.push(currentGroup);
        currentGroup = [curr];
      }
    }
    
    groups.push(currentGroup);
    return groups;
  }

  private calculateGroupBbox(bboxes: Array<{ x0: number; y0: number; x1: number; y1: number }>): {
    x0: number; y0: number; x1: number; y1: number;
  } {
    if (bboxes.length === 0) {
      return { x0: 0, y0: 0, x1: 0, y1: 0 };
    }
    
    return {
      x0: Math.min(...bboxes.map(b => b.x0)),
      y0: Math.min(...bboxes.map(b => b.y0)),
      x1: Math.max(...bboxes.map(b => b.x1)),
      y1: Math.max(...bboxes.map(b => b.y1))
    };
  }

  async terminate(): Promise<void> {
    console.log('Terminating Hybrid OCR Engine...');
    
    const terminations = [
      this.adaptiveEngine.terminate(),
      this.paddleEngine.terminate(),
      this.tableEngine.terminate()
    ];

    await Promise.allSettled(terminations);
    this.isInitialized = false;
    console.log('Hybrid OCR Engine terminated');
  }
}