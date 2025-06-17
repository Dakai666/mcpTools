import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
// PaddleOCR 後端
class PaddleOCRBackend {
    name = 'PaddleOCR';
    async isAvailable() {
        try {
            const result = await this.runPython('import paddleocr; print("available")');
            return result.includes('available');
        }
        catch {
            return false;
        }
    }
    async recognize(imageBuffer, options = {}) {
        const tempPath = `/tmp/ocr_temp_${Date.now()}.png`;
        try {
            await fs.writeFile(tempPath, imageBuffer);
            const pythonScript = `
import paddleocr
import json
import sys

ocr = paddleocr.PaddleOCR(
    use_angle_cls=True, 
    lang='chinese_cht',
    show_log=False,
    use_gpu=False
)

result = ocr.ocr('${tempPath}', cls=True)
output = {
    "text": "",
    "confidence": 0,
    "words": [],
    "blocks": []
}

if result and result[0]:
    total_confidence = 0
    word_count = 0
    all_text = []
    
    for line in result[0]:
        box = line[0]
        text_info = line[1]
        text = text_info[0]
        confidence = text_info[1] * 100
        
        all_text.append(text)
        total_confidence += confidence
        word_count += 1
        
        # 構建詞彙信息
        word_data = {
            "text": text,
            "confidence": confidence,
            "bbox": {
                "x0": int(min(box[0][0], box[3][0])),
                "y0": int(min(box[0][1], box[1][1])),
                "x1": int(max(box[1][0], box[2][0])),
                "y1": int(max(box[2][1], box[3][1]))
            }
        }
        output["words"].append(word_data)
    
    output["text"] = "\\n".join(all_text)
    output["confidence"] = total_confidence / word_count if word_count > 0 else 0

print(json.dumps(output, ensure_ascii=False))
`;
            const result = await this.runPython(pythonScript);
            const parsed = JSON.parse(result);
            return {
                text: parsed.text,
                confidence: parsed.confidence,
                words: parsed.words || [],
                paragraphs: this.groupWordsToParagraphs(parsed.words || []),
                blocks: this.groupWordsToBlocks(parsed.words || [])
            };
        }
        finally {
            try {
                await fs.unlink(tempPath);
            }
            catch { }
        }
    }
    async runPython(script) {
        return new Promise((resolve, reject) => {
            const python = spawn('python3', ['-c', script]);
            let output = '';
            let error = '';
            python.stdout.on('data', (data) => {
                output += data.toString();
            });
            python.stderr.on('data', (data) => {
                error += data.toString();
            });
            python.on('close', (code) => {
                if (code === 0) {
                    resolve(output.trim());
                }
                else {
                    reject(new Error(`Python script failed: ${error}`));
                }
            });
        });
    }
    groupWordsToParagraphs(words) {
        // 根據Y座標分組成段落
        const paragraphs = [];
        const sortedWords = words.sort((a, b) => a.bbox.y0 - b.bbox.y0);
        let currentParagraph = [];
        let lastY = -1;
        const lineThreshold = 20; // 行間距閾值
        for (const word of sortedWords) {
            if (lastY >= 0 && Math.abs(word.bbox.y0 - lastY) > lineThreshold) {
                if (currentParagraph.length > 0) {
                    paragraphs.push(this.createParagraphFromWords(currentParagraph));
                    currentParagraph = [];
                }
            }
            currentParagraph.push(word);
            lastY = word.bbox.y0;
        }
        if (currentParagraph.length > 0) {
            paragraphs.push(this.createParagraphFromWords(currentParagraph));
        }
        return paragraphs;
    }
    groupWordsToBlocks(words) {
        const paragraphs = this.groupWordsToParagraphs(words);
        if (paragraphs.length === 0)
            return [];
        return [{
                text: paragraphs.map(p => p.text).join('\n'),
                confidence: paragraphs.reduce((sum, p) => sum + p.confidence, 0) / paragraphs.length,
                bbox: this.calculateBoundingBox(paragraphs.map(p => p.bbox)),
                paragraphs
            }];
    }
    createParagraphFromWords(words) {
        const sortedWords = words.sort((a, b) => a.bbox.x0 - b.bbox.x0);
        return {
            text: sortedWords.map(w => w.text).join(' '),
            confidence: sortedWords.reduce((sum, w) => sum + w.confidence, 0) / sortedWords.length,
            bbox: this.calculateBoundingBox(sortedWords.map(w => w.bbox)),
            words: sortedWords
        };
    }
    calculateBoundingBox(bboxes) {
        if (bboxes.length === 0)
            return { x0: 0, y0: 0, x1: 0, y1: 0 };
        return {
            x0: Math.min(...bboxes.map(b => b.x0)),
            y0: Math.min(...bboxes.map(b => b.y0)),
            x1: Math.max(...bboxes.map(b => b.x1)),
            y1: Math.max(...bboxes.map(b => b.y1))
        };
    }
}
// 增強版 Tesseract 後端
class EnhancedTesseractBackend {
    name = 'Enhanced Tesseract';
    worker = null;
    isInitialized = false;
    async isAvailable() {
        return true; // Tesseract.js 總是可用
    }
    async recognize(imageBuffer, options = {}) {
        if (!this.worker || !this.isInitialized) {
            await this.initialize(options.languages || ['eng', 'chi_tra']);
        }
        try {
            const result = await this.worker.recognize(imageBuffer);
            return {
                text: result.data.text,
                confidence: result.data.confidence,
                words: this.extractWords(result, options.confidenceThreshold || 30),
                paragraphs: this.extractParagraphs(result, options.confidenceThreshold || 30),
                blocks: this.extractBlocks(result, options.confidenceThreshold || 30)
            };
        }
        catch (error) {
            console.error('Enhanced Tesseract recognition failed:', error);
            throw new Error(`Text recognition failed: ${error}`);
        }
    }
    async initialize(languages) {
        if (this.isInitialized)
            return;
        try {
            this.worker = await createWorker(languages, 1, {
                logger: () => { } // 關閉日誌
            });
            // 優化的 Tesseract 參數設定
            await this.worker.setParameters({
                tessedit_pageseg_mode: 6, // 假設單一均勻文字塊
                tessedit_ocr_engine_mode: 2, // 使用 LSTM 引擎
                preserve_interword_spaces: '1',
                tessedit_create_hocr: '1',
                // 針對中文優化
                textord_heavy_nr: '1',
                textord_debug_tabfind: '0',
                // 提升表格識別
                textord_tablefind_show_mark: '1',
                textord_tablefind_recognize_tables: '1'
            });
            this.isInitialized = true;
            console.log('Enhanced Tesseract initialized successfully');
        }
        catch (error) {
            console.error('Failed to initialize Enhanced Tesseract:', error);
            throw new Error(`OCR initialization failed: ${error}`);
        }
    }
    extractWords(result, minConfidence) {
        const words = [];
        const wordsData = result.data.words || [];
        wordsData.forEach((word) => {
            if (word.text && word.text.trim() && word.confidence >= minConfidence) {
                words.push({
                    text: word.text.trim(),
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
    extractParagraphs(result, minConfidence) {
        const paragraphs = [];
        const paragraphsData = result.data.paragraphs || [];
        paragraphsData.forEach((paragraph) => {
            if (paragraph.text && paragraph.text.trim() && paragraph.confidence >= minConfidence) {
                const words = (paragraph.words || [])
                    .filter((word) => word.confidence >= minConfidence)
                    .map((word) => ({
                    text: word.text.trim(),
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
                        text: paragraph.text.trim(),
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
        return paragraphs;
    }
    extractBlocks(result, minConfidence) {
        const blocks = [];
        const blocksData = result.data.blocks || [];
        blocksData.forEach((block) => {
            if (block.text && block.text.trim() && block.confidence >= minConfidence) {
                const paragraphs = (block.paragraphs || [])
                    .filter((p) => p.confidence >= minConfidence)
                    .map((paragraph) => {
                    const words = (paragraph.words || [])
                        .filter((word) => word.confidence >= minConfidence)
                        .map((word) => ({
                        text: word.text.trim(),
                        confidence: word.confidence,
                        bbox: {
                            x0: word.bbox.x0,
                            y0: word.bbox.y0,
                            x1: word.bbox.x1,
                            y1: word.bbox.y1
                        }
                    }));
                    return {
                        text: paragraph.text.trim(),
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
                        text: block.text.trim(),
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
        return blocks;
    }
    async terminate() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
            this.isInitialized = false;
        }
    }
}
export class EnhancedOCREngine {
    backends = [];
    currentBackend = null;
    constructor() {
        this.backends = [
            new PaddleOCRBackend(),
            new EnhancedTesseractBackend()
        ];
    }
    async initialize() {
        // 選擇第一個可用的後端
        for (const backend of this.backends) {
            if (await backend.isAvailable()) {
                this.currentBackend = backend;
                console.log(`Using OCR backend: ${backend.name}`);
                break;
            }
        }
        if (!this.currentBackend) {
            throw new Error('No OCR backend available');
        }
    }
    async processImage(imagePath, options = {}) {
        try {
            let image = sharp(imagePath);
            const metadata = await image.metadata();
            // 針對繁體中文優化的圖像處理
            if (options.enhanceContrast !== false) {
                // 增強對比度和銳度
                image = image
                    .modulate({
                    brightness: 1.2, // 稍微提高亮度
                    saturation: 0.9, // 降低飽和度
                    hue: 0
                })
                    .sharpen({ sigma: 1.5 }); // 增強銳化
            }
            if (options.removeNoise !== false) {
                // 更好的降噪處理
                image = image.median(2).blur(0.3);
            }
            // 智能縮放
            if (options.resize) {
                const { width, height, maintainAspectRatio = true } = options.resize;
                if (maintainAspectRatio && width && height) {
                    image = image.resize(width, height, {
                        fit: 'inside',
                        withoutEnlargement: true,
                        kernel: sharp.kernel.lanczos3
                    });
                }
            }
            else {
                // 自動調整大小以提高OCR精度
                if (metadata.width && metadata.width < 1200) {
                    const scale = 1200 / metadata.width;
                    image = image.resize(Math.round(metadata.width * scale), null, {
                        kernel: sharp.kernel.lanczos3
                    });
                }
            }
            // 轉換為灰度並應用自適應閾值
            image = image
                .greyscale()
                .normalize() // 標準化像素值
                .linear(1.2, -(128 * 1.2) + 128); // 增加對比度
            return await image.png().toBuffer();
        }
        catch (error) {
            console.error('Enhanced image processing failed:', error);
            throw new Error(`Image processing failed: ${error}`);
        }
    }
    async recognizeText(imageBuffer, options = {}) {
        if (!this.currentBackend) {
            await this.initialize();
        }
        if (!this.currentBackend) {
            throw new Error('No OCR backend available');
        }
        // 設定針對繁體中文的預設選項
        const enhancedOptions = {
            languages: ['chi_tra', 'eng'],
            confidenceThreshold: 20, // 降低閾值以獲得更多結果
            ...options
        };
        try {
            const result = await this.currentBackend.recognize(imageBuffer, enhancedOptions);
            // 後處理：清理和修正文字
            return this.postProcessResult(result);
        }
        catch (error) {
            console.error(`OCR recognition failed with ${this.currentBackend.name}:`, error);
            // 如果當前後端失敗，嘗試下一個
            const currentIndex = this.backends.indexOf(this.currentBackend);
            for (let i = currentIndex + 1; i < this.backends.length; i++) {
                const fallbackBackend = this.backends[i];
                if (await fallbackBackend.isAvailable()) {
                    console.log(`Falling back to: ${fallbackBackend.name}`);
                    this.currentBackend = fallbackBackend;
                    return await fallbackBackend.recognize(imageBuffer, enhancedOptions);
                }
            }
            throw error;
        }
    }
    postProcessResult(result) {
        // 文字清理和修正
        const cleanText = (text) => {
            return text
                .replace(/\s+/g, ' ') // 多個空格替換為單個空格
                .replace(/[""]/g, '"') // 統一引號
                .replace(/['']/g, "'") // 統一單引號
                .trim();
        };
        return {
            text: cleanText(result.text),
            confidence: result.confidence,
            words: result.words.map(word => ({
                ...word,
                text: cleanText(word.text)
            })),
            paragraphs: result.paragraphs.map(paragraph => ({
                ...paragraph,
                text: cleanText(paragraph.text),
                words: paragraph.words.map(word => ({
                    ...word,
                    text: cleanText(word.text)
                }))
            })),
            blocks: result.blocks.map(block => ({
                ...block,
                text: cleanText(block.text),
                paragraphs: block.paragraphs.map(paragraph => ({
                    ...paragraph,
                    text: cleanText(paragraph.text),
                    words: paragraph.words.map(word => ({
                        ...word,
                        text: cleanText(word.text)
                    }))
                }))
            }))
        };
    }
    getAvailableBackends() {
        return this.backends.map(b => b.name);
    }
    getCurrentBackend() {
        return this.currentBackend?.name || null;
    }
    async terminate() {
        if (this.currentBackend && 'terminate' in this.currentBackend) {
            await this.currentBackend.terminate();
        }
    }
}
//# sourceMappingURL=EnhancedOCREngine.js.map