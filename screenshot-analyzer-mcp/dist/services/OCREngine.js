import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
export class OCREngine {
    worker = null;
    isInitialized = false;
    async initialize(languages = ['eng', 'chi_tra', 'chi_sim']) {
        if (this.isInitialized)
            return;
        try {
            this.worker = await createWorker(languages, 1, {
                logger: m => console.log(m)
            });
            // Configure OCR parameters
            await this.worker.setParameters({
                tessedit_pageseg_mode: 1,
                tessedit_ocr_engine_mode: 1,
                tessedit_char_whitelist: '',
                preserve_interword_spaces: '1',
            });
            this.isInitialized = true;
            console.log('OCR Engine initialized successfully');
        }
        catch (error) {
            console.error('Failed to initialize OCR Engine:', error);
            throw new Error(`OCR initialization failed: ${error}`);
        }
    }
    async processImage(imagePath, options = {}) {
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
                }
                else if (width || height) {
                    image = image.resize(width, height);
                }
            }
            else {
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
        }
        catch (error) {
            console.error('Image processing failed:', error);
            throw new Error(`Image processing failed: ${error}`);
        }
    }
    async recognizeText(imageBuffer, options = {}) {
        if (!this.worker || !this.isInitialized) {
            await this.initialize(options.languages);
        }
        try {
            const result = await this.worker.recognize(imageBuffer);
            const ocrResult = {
                text: result.data.text,
                confidence: result.data.confidence,
                words: this.extractWords(result),
                paragraphs: this.extractParagraphs(result),
                blocks: this.extractBlocks(result)
            };
            return ocrResult;
        }
        catch (error) {
            console.error('Text recognition failed:', error);
            throw new Error(`Text recognition failed: ${error}`);
        }
    }
    extractWords(result) {
        const words = [];
        const wordsData = result.data.words || [];
        wordsData.forEach((word) => {
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
    extractParagraphs(result) {
        const paragraphs = [];
        const paragraphsData = result.data.paragraphs || [];
        paragraphsData.forEach((paragraph) => {
            if (paragraph.text && paragraph.text.trim() && paragraph.confidence > 30) {
                const words = (paragraph.words || []).map((word) => ({
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
    extractBlocks(result) {
        const blocks = [];
        const blocksData = result.data.blocks || [];
        blocksData.forEach((block) => {
            if (block.text && block.text.trim() && block.confidence > 30) {
                const paragraphs = (block.paragraphs || []).map((paragraph) => {
                    const words = (paragraph.words || []).map((word) => ({
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
    async terminate() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
            this.isInitialized = false;
            console.log('OCR Engine terminated');
        }
    }
}
//# sourceMappingURL=OCREngine.js.map