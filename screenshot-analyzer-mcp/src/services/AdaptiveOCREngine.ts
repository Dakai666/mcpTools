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

export class AdaptiveOCREngine {
  private worker: Worker | null = null;
  private isInitialized = false;

  async initialize(languages: string[] = ['chi_tra', 'eng']): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.worker = await createWorker(languages, 1, {
        logger: () => {} // 關閉日誌
      });

      // 針對多種場景優化的參數
      await this.worker.setParameters({
        tessedit_pageseg_mode: 3 as any,
        tessedit_ocr_engine_mode: 2 as any,
        preserve_interword_spaces: '1',
        tessedit_create_hocr: '1',
        // 中文優化
        textord_heavy_nr: '1',
        textord_debug_tabfind: '0',
        // 表格檢測
        textord_tablefind_show_mark: '1',
        textord_tablefind_recognize_tables: '1',
        // 字符分割優化
        chop_enable: '1',
        use_new_state_cost: '0',
        segment_segcost_rating: '0',
        enable_new_segsearch: '0',
        // 低對比度文字優化
        textord_noise_normratio: '2',
        textord_noise_syfraction: '0.5',
        textord_noise_sizefraction: '0.1',
        // 字典和語言模型
        language_model_penalty_non_freq_dict_word: '0.1',
        language_model_penalty_non_dict_word: '0.15'
      });

      this.isInitialized = true;
      console.log('Adaptive OCR Engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Adaptive OCR Engine:', error);
      throw new Error(`OCR initialization failed: ${error}`);
    }
  }

  /**
   * 自適應影像預處理 - 根據影像特性選擇最佳處理策略
   */
  async processImage(
    imagePath: string, 
    options: ImageProcessOptions = {}
  ): Promise<Buffer> {
    try {
      let image = sharp(imagePath);
      const metadata = await image.metadata();
      console.log(`Processing image: ${metadata.width}x${metadata.height}`);

      // 分析影像特性以選擇處理策略
      const imageStats = await this.analyzeImageStats(image);
      console.log('Image stats:', imageStats);

      // 智能縮放 - 確保OCR最佳解析度
      if (metadata.width && metadata.width < 1200) {
        const targetWidth = Math.min(1800, metadata.width * 2);
        image = image.resize(targetWidth, null, {
          kernel: sharp.kernel.lanczos3,
          withoutEnlargement: false
        });
        console.log(`Resized to: ${targetWidth}px width`);
      }

      // 根據影像特性選擇處理策略
      if (imageStats.isLowContrast) {
        // 低對比度影像：保守處理，避免丟失淺色文字
        image = await this.processLowContrastImage(image, options);
      } else if (imageStats.isHighNoise) {
        // 高噪聲影像：強化降噪
        image = await this.processNoisyImage(image, options);
      } else {
        // 標準影像：平衡處理
        image = await this.processStandardImage(image, options);
      }

      return await image.png().toBuffer();
    } catch (error) {
      console.error('Adaptive image processing failed:', error);
      throw new Error(`Image processing failed: ${error}`);
    }
  }

  /**
   * 分析影像統計特性
   */
  private async analyzeImageStats(image: sharp.Sharp): Promise<{
    isLowContrast: boolean;
    isHighNoise: boolean;
    brightness: number;
    contrast: number;
  }> {
    try {
      const stats = await image.stats();
      const { channels } = stats;
      
      // 計算亮度（取RGB平均）
      const brightness = channels.length >= 3 
        ? (channels[0].mean + channels[1].mean + channels[2].mean) / 3
        : channels[0].mean;
      
      // 計算對比度（標準差）
      const contrast = channels.length >= 3
        ? (channels[0].stdev + channels[1].stdev + channels[2].stdev) / 3
        : channels[0].stdev;

      return {
        isLowContrast: contrast < 30, // 低對比度閾值
        isHighNoise: contrast > 80,   // 高噪聲閾值
        brightness,
        contrast
      };
    } catch (error) {
      console.error('Error analyzing image stats:', error);
      return {
        isLowContrast: false,
        isHighNoise: false,
        brightness: 128,
        contrast: 50
      };
    }
  }

  /**
   * 處理低對比度影像（保護淺色文字）
   */
  private async processLowContrastImage(
    image: sharp.Sharp, 
    options: ImageProcessOptions
  ): Promise<sharp.Sharp> {
    console.log('Applying low contrast processing');
    
    if (options.enhanceContrast !== false) {
      // 溫和的對比度增強，不使用二值化
      image = image
        .modulate({
          brightness: 1.1,    // 微調亮度
          saturation: 0.9,    // 微降飽和度
          hue: 0
        })
        .linear(1.2, -(128 * 1.2) + 128); // 溫和的線性增強
    }

    if (options.removeNoise !== false) {
      // 最輕微的降噪
      image = image.median(1);
    }

    // 轉灰度並輕微銳化，但不二值化
    image = image
      .greyscale()
      .normalize() // 自動調整對比度
      .sharpen({ sigma: 1, m1: 0, m2: 2 }); // 溫和銳化

    return image;
  }

  /**
   * 處理高噪聲影像
   */
  private async processNoisyImage(
    image: sharp.Sharp, 
    options: ImageProcessOptions
  ): Promise<sharp.Sharp> {
    console.log('Applying noisy image processing');
    
    if (options.removeNoise !== false) {
      // 強化降噪
      image = image
        .median(2)      // 中值濾波
        .blur(0.3);     // 輕微模糊
    }

    if (options.enhanceContrast !== false) {
      image = image
        .modulate({
          brightness: 1.2,
          saturation: 0.7,
          hue: 0
        })
        .linear(1.4, -(128 * 1.4) + 128);
    }

    // 灰度化並適度二值化
    image = image
      .greyscale()
      .normalize()
      .sharpen({ sigma: 2, m1: 0, m2: 3 })
      .threshold(100); // 較低閾值保留更多細節

    return image;
  }

  /**
   * 處理標準影像
   */
  private async processStandardImage(
    image: sharp.Sharp, 
    options: ImageProcessOptions
  ): Promise<sharp.Sharp> {
    console.log('Applying standard image processing');
    
    if (options.enhanceContrast !== false) {
      image = image
        .modulate({
          brightness: 1.15,
          saturation: 0.85,
          hue: 0
        })
        .linear(1.3, -(128 * 1.3) + 128);
    }

    if (options.removeNoise !== false) {
      image = image.median(1).blur(0.2);
    }

    // 自適應閾值處理
    const processedImage = await this.applyAdaptiveThreshold(image);
    return processedImage;
  }

  /**
   * 自適應閾值處理
   */
  private async applyAdaptiveThreshold(image: sharp.Sharp): Promise<sharp.Sharp> {
    try {
      // 先轉灰度並normalize
      let processed = image
        .greyscale()
        .normalize()
        .sharpen({ sigma: 1.5, m1: 0, m2: 2.5 });

      // 嘗試不同閾值，選擇最佳結果
      const thresholds = [80, 100, 120, 140];
      let bestResult = processed;
      
      // 對於大多數情況，使用中等閾值
      bestResult = processed.threshold(100);
      
      return bestResult;
    } catch (error) {
      console.error('Adaptive threshold failed:', error);
      // fallback到簡單處理
      return image
        .greyscale()
        .normalize()
        .sharpen({ sigma: 1, m1: 0, m2: 2 });
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
        rectangle: undefined
      });
      
      console.log(`OCR completed with confidence: ${result.data.confidence}`);
      
      // 動態調整信心閾值
      const adaptiveThreshold = this.calculateAdaptiveThreshold(
        result.data.confidence,
        options.confidenceThreshold || 15
      );
      
      const ocrResult: OCRResult = {
        text: this.cleanText(result.data.text),
        confidence: result.data.confidence,
        words: this.extractWords(result, adaptiveThreshold),
        paragraphs: this.extractParagraphs(result, adaptiveThreshold),
        blocks: this.extractBlocks(result, adaptiveThreshold)
      };

      return ocrResult;
    } catch (error) {
      console.error('Adaptive text recognition failed:', error);
      throw new Error(`Text recognition failed: ${error}`);
    }
  }

  /**
   * 計算自適應信心閾值
   */
  private calculateAdaptiveThreshold(
    overallConfidence: number, 
    baseThreshold: number
  ): number {
    if (overallConfidence > 80) {
      return Math.max(baseThreshold, 20);
    } else if (overallConfidence > 60) {
      return Math.max(baseThreshold * 0.8, 10);
    } else {
      return Math.max(baseThreshold * 0.6, 5);
    }
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .replace(/[\u00A0\u2000-\u200B\u2028-\u2029\u202F\u205F\u3000]/g, ' ')
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
      console.log('Adaptive OCR Engine terminated');
    }
  }
}