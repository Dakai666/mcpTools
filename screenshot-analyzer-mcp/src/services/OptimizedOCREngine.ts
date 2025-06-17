import { createWorker, Worker, RecognizeResult } from 'tesseract.js';
import sharp from 'sharp';
import { 
  OCRResult, 
  ImageProcessOptions, 
  AnalysisOptions, 
  BoundingBox,
  WordData,
  ParagraphData,
  BlockData 
} from '../types/index.js';

export class OptimizedOCREngine {
  private worker: Worker | null = null;
  private isInitialized = false;

  async initialize(languages: string[] = ['chi_tra', 'eng']): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.worker = await createWorker(languages, 1, {
        logger: () => {} // 關閉日誌
      });

      // 專門針對繁體中文優化的參數
      await this.worker.setParameters({
        tessedit_pageseg_mode: 3 as any,  // 完全自動頁面分割，無OSD
        tessedit_ocr_engine_mode: 2 as any, // 僅使用LSTM引擎
        preserve_interword_spaces: '1',
        tessedit_create_hocr: '1',
        // 針對中文字符優化
        textord_heavy_nr: '1',
        textord_debug_tabfind: '0',
        // 表格檢測增強
        textord_tablefind_show_mark: '1',
        textord_tablefind_recognize_tables: '1',
        // 字符分割優化
        chop_enable: '1',
        use_new_state_cost: '0',
        segment_segcost_rating: '0',
        enable_new_segsearch: '0',
        // 中文字符識別優化
        language_model_penalty_non_freq_dict_word: '0.1',
        language_model_penalty_non_dict_word: '0.15'
      });

      this.isInitialized = true;
      console.log('Optimized OCR Engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Optimized OCR Engine:', error);
      throw new Error(`OCR initialization failed: ${error}`);
    }
  }

  async processImage(
    imagePath: string, 
    options: ImageProcessOptions = {}
  ): Promise<Buffer> {
    try {
      let image = sharp(imagePath);
      
      const metadata = await image.metadata();
      console.log(`Processing image: ${metadata.width}x${metadata.height}`);

      // 針對表格和中文文檔的專門處理
      if (options.enhanceContrast !== false) {
        image = image
          .modulate({
            brightness: 1.3,  // 提高亮度
            saturation: 0.8,  // 降低飽和度
            hue: 0
          })
          .linear(1.5, -(128 * 1.5) + 128); // 增強對比度
      }

      if (options.removeNoise !== false) {
        // 更溫和的降噪，保持文字清晰
        image = image.median(1).blur(0.2);
      }

      // 智能縮放以提高OCR精度
      if (metadata.width && metadata.width < 1500) {
        const targetWidth = 1500;
        const scale = targetWidth / metadata.width;
        image = image.resize(Math.round(metadata.width * scale), null, {
          kernel: sharp.kernel.lanczos3,
          withoutEnlargement: false
        });
        console.log(`Resized to: ${Math.round(metadata.width * scale)}px width`);
      }

      // 灰度處理和二值化
      image = image
        .greyscale()
        .normalize()
        .sharpen({ sigma: 2, m1: 0, m2: 3 })
        .threshold(120); // 更低的閾值以保留更多細節

      return await image.png().toBuffer();
    } catch (error) {
      console.error('Optimized image processing failed:', error);
      throw new Error(`Image processing failed: ${error}`);
    }
  }

  async recognizeText(
    imageBuffer: Buffer,
    options: AnalysisOptions = {}
  ): Promise<OCRResult> {
    if (!this.worker || !this.isInitialized) {
      await this.initialize(options.languages || ['chi_tra', 'eng']);
    }

    try {
      const result: RecognizeResult = await this.worker!.recognize(imageBuffer, {
        rectangle: undefined // 分析整個圖像
      });
      
      console.log(`OCR completed with confidence: ${result.data.confidence}`);
      
      const ocrResult: OCRResult = {
        text: this.cleanText(result.data.text),
        confidence: result.data.confidence,
        words: this.extractWords(result, options.confidenceThreshold || 15),
        paragraphs: this.extractParagraphs(result, options.confidenceThreshold || 15),
        blocks: this.extractBlocks(result, options.confidenceThreshold || 15)
      };

      return ocrResult;
    } catch (error) {
      console.error('Optimized text recognition failed:', error);
      throw new Error(`Text recognition failed: ${error}`);
    }
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // 多個空格替換為單個
      .replace(/[""]/g, '"') // 統一引號
      .replace(/['']/g, "'") // 統一單引號
      .replace(/[\u00A0\u2000-\u200B\u2028-\u2029\u202F\u205F\u3000]/g, ' ') // 清理各種空白字符
      .trim();
  }

  private extractWords(result: RecognizeResult, minConfidence: number): WordData[] {
    const words: WordData[] = [];
    const wordsData = (result.data as any).words || [];
    
    wordsData.forEach((word: any) => {
      if (word.text && word.text.trim() && word.confidence >= minConfidence) {
        words.push({
          text: this.cleanText(word.text),
          confidence: word.confidence,
          bbox: {
            x0: word.bbox.x0,
            y0: word.bbox.y0,
            x1: word.bbox.x1,
            y1: word.bbox.y1
          }
        });
      }
    });

    return words.sort((a, b) => {
      // 按位置排序：先Y軸後X軸
      if (Math.abs(a.bbox.y0 - b.bbox.y0) < 10) {
        return a.bbox.x0 - b.bbox.x0;
      }
      return a.bbox.y0 - b.bbox.y0;
    });
  }

  private extractParagraphs(result: RecognizeResult, minConfidence: number): ParagraphData[] {
    const paragraphs: ParagraphData[] = [];
    const paragraphsData = (result.data as any).paragraphs || [];
    
    paragraphsData.forEach((paragraph: any) => {
      if (paragraph.text && paragraph.text.trim() && paragraph.confidence >= minConfidence) {
        const words = (paragraph.words || [])
          .filter((word: any) => word.confidence >= minConfidence)
          .map((word: any) => ({
            text: this.cleanText(word.text),
            confidence: word.confidence,
            bbox: {
              x0: word.bbox.x0,
              y0: word.bbox.y0,
              x1: word.bbox.x1,
              y1: word.bbox.y1
            }
          }));

        if (words.length > 0) {
          paragraphs.push({
            text: this.cleanText(paragraph.text),
            confidence: paragraph.confidence,
            bbox: {
              x0: paragraph.bbox.x0,
              y0: paragraph.bbox.y0,
              x1: paragraph.bbox.x1,
              y1: paragraph.bbox.y1
            },
            words
          });
        }
      }
    });

    return paragraphs.sort((a, b) => a.bbox.y0 - b.bbox.y0);
  }

  private extractBlocks(result: RecognizeResult, minConfidence: number): BlockData[] {
    const blocks: BlockData[] = [];
    const blocksData = (result.data as any).blocks || [];
    
    blocksData.forEach((block: any) => {
      if (block.text && block.text.trim() && block.confidence >= minConfidence) {
        const paragraphs = (block.paragraphs || [])
          .filter((p: any) => p.confidence >= minConfidence)
          .map((paragraph: any) => {
            const words = (paragraph.words || [])
              .filter((word: any) => word.confidence >= minConfidence)
              .map((word: any) => ({
                text: this.cleanText(word.text),
                confidence: word.confidence,
                bbox: {
                  x0: word.bbox.x0,
                  y0: word.bbox.y0,
                  x1: word.bbox.x1,
                  y1: word.bbox.y1
                }
              }));

            return {
              text: this.cleanText(paragraph.text),
              confidence: paragraph.confidence,
              bbox: {
                x0: paragraph.bbox.x0,
                y0: paragraph.bbox.y0,
                x1: paragraph.bbox.x1,
                y1: paragraph.bbox.y1
              },
              words
            };
          });

        if (paragraphs.length > 0) {
          blocks.push({
            text: this.cleanText(block.text),
            confidence: block.confidence,
            bbox: {
              x0: block.bbox.x0,
              y0: block.bbox.y0,
              x1: block.bbox.x1,
              y1: block.bbox.y1
            },
            paragraphs
          });
        }
      }
    });

    return blocks.sort((a, b) => a.bbox.y0 - b.bbox.y0);
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      console.log('Optimized OCR Engine terminated');
    }
  }
}