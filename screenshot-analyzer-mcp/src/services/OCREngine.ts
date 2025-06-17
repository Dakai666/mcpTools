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

export class OCREngine {
  private worker: Worker | null = null;
  private isInitialized = false;

  async initialize(languages: string[] = ['eng', 'chi_tra', 'chi_sim']): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.worker = await createWorker(languages, 1, {
        logger: m => console.log(m)
      });

      // Configure OCR parameters
      await this.worker.setParameters({
        tessedit_pageseg_mode: 1 as any,
        tessedit_ocr_engine_mode: 1 as any,
        tessedit_char_whitelist: '',
        preserve_interword_spaces: '1',
      });

      this.isInitialized = true;
      console.log('OCR Engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize OCR Engine:', error);
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
      
      if (options.enhanceContrast) {
        image = image.normalize().modulate({
          brightness: 1.1,
          saturation: 0.8
        });
      }

      if (options.removeNoise) {
        image = image.median(3);
      }

      if (options.resize) {
        const { width, height, maintainAspectRatio = true } = options.resize;
        if (maintainAspectRatio && width && height) {
          image = image.resize(width, height, {
            fit: 'inside',
            withoutEnlargement: true
          });
        } else if (width || height) {
          image = image.resize(width, height);
        }
      } else {
        if (metadata.width && metadata.width < 800) {
          const scale = 800 / metadata.width;
          image = image.resize(Math.round(metadata.width * scale));
        }
      }

      image = image
        .greyscale()
        .sharpen()
        .threshold(128);

      return await image.png().toBuffer();
    } catch (error) {
      console.error('Image processing failed:', error);
      throw new Error(`Image processing failed: ${error}`);
    }
  }

  async recognizeText(
    imageBuffer: Buffer,
    options: AnalysisOptions = {}
  ): Promise<OCRResult> {
    if (!this.worker || !this.isInitialized) {
      await this.initialize(options.languages);
    }

    try {
      const result: RecognizeResult = await this.worker!.recognize(imageBuffer);
      
      const ocrResult: OCRResult = {
        text: result.data.text,
        confidence: result.data.confidence,
        words: this.extractWords(result),
        paragraphs: this.extractParagraphs(result),
        blocks: this.extractBlocks(result)
      };

      return ocrResult;
    } catch (error) {
      console.error('Text recognition failed:', error);
      throw new Error(`Text recognition failed: ${error}`);
    }
  }

  private extractWords(result: RecognizeResult): WordData[] {
    const words: WordData[] = [];
    
    const wordsData = (result.data as any).words || [];
    wordsData.forEach((word: any) => {
      if (word.text && word.text.trim() && word.confidence > 30) {
        words.push({
          text: word.text,
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

    return words;
  }

  private extractParagraphs(result: RecognizeResult): ParagraphData[] {
    const paragraphs: ParagraphData[] = [];
    
    const paragraphsData = (result.data as any).paragraphs || [];
    paragraphsData.forEach((paragraph: any) => {
      if (paragraph.text && paragraph.text.trim() && paragraph.confidence > 30) {
        const words = (paragraph.words || []).map((word: any) => ({
          text: word.text,
          confidence: word.confidence,
          bbox: {
            x0: word.bbox.x0,
            y0: word.bbox.y0,
            x1: word.bbox.x1,
            y1: word.bbox.y1
          }
        }));

        paragraphs.push({
          text: paragraph.text,
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
    });

    return paragraphs;
  }

  private extractBlocks(result: RecognizeResult): BlockData[] {
    const blocks: BlockData[] = [];
    
    const blocksData = (result.data as any).blocks || [];
    blocksData.forEach((block: any) => {
      if (block.text && block.text.trim() && block.confidence > 30) {
        const paragraphs = (block.paragraphs || []).map((paragraph: any) => {
          const words = (paragraph.words || []).map((word: any) => ({
            text: word.text,
            confidence: word.confidence,
            bbox: {
              x0: word.bbox.x0,
              y0: word.bbox.y0,
              x1: word.bbox.x1,
              y1: word.bbox.y1
            }
          }));

          return {
            text: paragraph.text,
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

        blocks.push({
          text: block.text,
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
    });

    return blocks;
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      console.log('OCR Engine terminated');
    }
  }
}