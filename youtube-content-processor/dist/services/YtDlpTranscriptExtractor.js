import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/**
 * 基於yt_dlp的YouTube字幕提取器
 * 使用可靠的yt_dlp Python庫來繞過YouTube的限制
 */
export class YtDlpTranscriptExtractor {
    pythonPath;
    scriptPath;
    tempDir;
    constructor(pythonPath) {
        // 嘗試找到正確的Python路徑
        const projectRoot = path.resolve(__dirname, '..', '..');
        const venvPython = path.join(projectRoot, 'venv', 'bin', 'python');
        this.pythonPath = pythonPath || venvPython;
        this.scriptPath = path.join(__dirname, '..', 'analyze_youtube.py');
        this.tempDir = path.join(process.cwd(), 'temp');
    }
    /**
     * 提取YouTube影片字幕
     */
    async extract(videoUrl, options = {}) {
        const { languagePreference = ['zh-TW', 'zh-Hans', 'zh', 'en'], includeAutomatic = true, outputFormat = 'segments' } = options;
        try {
            // 確保臨時目錄存在（使用原生 fs 模組）
            try {
                await fs.mkdir(this.tempDir, { recursive: true });
            }
            catch (error) {
                // 目錄已存在，忽略錯誤
            }
            // 獲取影片資訊和可用字幕
            const videoInfo = await this.getVideoInfo(videoUrl);
            const availableCaptions = await this.getAvailableCaptions(videoUrl);
            // 選擇最佳字幕語言
            const selectedCaption = this.selectBestCaption(availableCaptions, languagePreference, includeAutomatic);
            if (!selectedCaption) {
                throw new Error('沒有找到可用的字幕');
            }
            // 測試：強制使用新的清理邏輯
            console.log('🔧 使用新的激進清理邏輯...');
            const segments = await this.downloadAndParseSubtitles(videoUrl, selectedCaption.language);
            console.log(`🔧 清理後獲得 ${segments.length} 段字幕`);
            // 直接使用 Python 清理後的結果
            const fullText = segments.map(seg => seg.text).join(' ');
            return {
                videoInfo,
                segments,
                fullText,
                captionInfo: selectedCaption
            };
        }
        catch (error) {
            throw new Error(`字幕提取失敗: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * 獲取影片基本資訊
     */
    async getVideoInfo(videoUrl) {
        return new Promise((resolve, reject) => {
            const args = [
                '-c',
                `
import yt_dlp
import json
import sys

def get_video_info(url):
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            # 解析持續時間
            duration = info.get('duration', 0)
            
            # 解析發布日期
            upload_date = info.get('upload_date', '')
            publish_date = ''
            if upload_date and len(upload_date) == 8:
                publish_date = f"{upload_date[:4]}-{upload_date[4:6]}-{upload_date[6:8]}"
            
            result = {
                'id': info.get('id', ''),
                'title': info.get('title', ''),
                'channel': info.get('uploader', '') or info.get('channel', ''),
                'duration': duration,
                'viewCount': info.get('view_count'),
                'description': info.get('description', ''),
                'publishDate': publish_date
            }
            
            print(json.dumps(result, ensure_ascii=False))
            
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

get_video_info("${videoUrl}")
        `
            ];
            const process = spawn(this.pythonPath, args);
            let stdout = '';
            let stderr = '';
            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            process.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Python腳本執行失敗: ${stderr}`));
                    return;
                }
                try {
                    const videoInfo = JSON.parse(stdout.trim());
                    resolve(videoInfo);
                }
                catch (error) {
                    reject(new Error(`JSON解析失敗: ${error instanceof Error ? error.message : String(error)}`));
                }
            });
            process.on('error', (error) => {
                reject(new Error(`進程執行失敗: ${error instanceof Error ? error.message : String(error)}`));
            });
        });
    }
    /**
     * 獲取可用字幕列表
     */
    async getAvailableCaptions(videoUrl) {
        return new Promise((resolve, reject) => {
            const args = [
                '-c',
                `
import yt_dlp
import json
import sys

def get_available_captions(url):
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            captions = []
            
            # 手動字幕
            if 'subtitles' in info:
                for lang, formats in info['subtitles'].items():
                    captions.append({
                        'language': lang,
                        'name': f'{lang} (手動)',
                        'isAutomatic': False
                    })
            
            # 自動生成字幕
            if 'automatic_captions' in info:
                for lang, formats in info['automatic_captions'].items():
                    # 避免重複添加已有手動字幕的語言
                    if not any(c['language'] == lang and not c['isAutomatic'] for c in captions):
                        captions.append({
                            'language': lang,
                            'name': f'{lang} (自動)',
                            'isAutomatic': True
                        })
            
            print(json.dumps(captions, ensure_ascii=False))
            
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

get_available_captions("${videoUrl}")
        `
            ];
            const process = spawn(this.pythonPath, args);
            let stdout = '';
            let stderr = '';
            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            process.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Python腳本執行失敗: ${stderr}`));
                    return;
                }
                try {
                    const captions = JSON.parse(stdout.trim());
                    resolve(captions);
                }
                catch (error) {
                    reject(new Error(`JSON解析失敗: ${error instanceof Error ? error.message : String(error)}`));
                }
            });
            process.on('error', (error) => {
                reject(new Error(`進程執行失敗: ${error instanceof Error ? error.message : String(error)}`));
            });
        });
    }
    /**
     * 選擇最佳字幕語言
     */
    selectBestCaption(availableCaptions, languagePreference, includeAutomatic) {
        // 優先選擇手動字幕
        for (const prefLang of languagePreference) {
            const manualCaption = availableCaptions.find(cap => cap.language === prefLang && !cap.isAutomatic);
            if (manualCaption) {
                return manualCaption;
            }
        }
        // 如果沒有手動字幕且允許自動字幕，則選擇自動字幕
        if (includeAutomatic) {
            for (const prefLang of languagePreference) {
                const autoCaption = availableCaptions.find(cap => cap.language === prefLang && cap.isAutomatic);
                if (autoCaption) {
                    return autoCaption;
                }
            }
        }
        // 最後選擇任何可用的字幕
        return availableCaptions.find(cap => !cap.isAutomatic) ||
            (includeAutomatic ? availableCaptions[0] : null) ||
            null;
    }
    /**
     * 清理字幕內容，去除重複和優化格式
     */
    cleanTranscriptSegments(segments) {
        if (!segments || segments.length === 0)
            return [];
        const cleaned = [];
        let lastText = '';
        for (const segment of segments) {
            // 移除HTML標籤和多餘空白
            let cleanText = segment.text
                .replace(/<[^>]*>/g, '') // 移除HTML標籤
                .replace(/\s+/g, ' ') // 標準化空白
                .trim();
            // 跳過空內容
            if (!cleanText)
                continue;
            // 跳過與上一段完全重複的內容
            if (cleanText === lastText)
                continue;
            // 跳過過短的片段（通常是雜音）
            if (cleanText.length < 3)
                continue;
            // 修正時間戳（如果start和end都是0，估算時間）
            let { start, end, duration } = segment;
            if (start === 0 && end === 0 && cleaned.length > 0) {
                const prevSegment = cleaned[cleaned.length - 1];
                start = prevSegment.end;
                end = start + (duration || 3); // 預設3秒
            }
            // 確保時間邏輯正確
            if (end <= start) {
                end = start + (duration || 3);
            }
            cleaned.push({
                text: cleanText,
                start,
                end,
                duration: end - start
            });
            lastText = cleanText;
        }
        return cleaned;
    }
    /**
     * 激進的字幕清理和優化，專門處理 YouTube 重複字幕
     */
    aggressiveCleanTranscript(segments) {
        if (!segments || segments.length === 0) {
            return { cleanedSegments: [], optimizedText: '' };
        }
        // 第一步：提取所有唯一的詞語，按時間順序
        const allWords = [];
        const seenWords = new Set();
        for (const segment of segments) {
            const words = segment.text.toLowerCase().split(/\s+/);
            for (const word of words) {
                const cleanWord = word.replace(/[^\w]/g, '');
                if (cleanWord && !seenWords.has(cleanWord)) {
                    allWords.push({ word, time: segment.start });
                    seenWords.add(cleanWord);
                }
            }
        }
        // 第二步：重新組合成有意義的句子
        const sentences = [];
        let currentSentence = [];
        let lastTime = 0;
        for (const { word, time } of allWords) {
            // 如果時間間隔太大，可能是新句子
            if (time - lastTime > 5 && currentSentence.length > 3) {
                sentences.push(currentSentence.join(' ').trim());
                currentSentence = [];
            }
            currentSentence.push(word);
            lastTime = time;
            // 如果遇到句號等，結束句子
            if (word.match(/[.!?。！？]$/)) {
                sentences.push(currentSentence.join(' ').trim());
                currentSentence = [];
            }
        }
        // 添加最後的句子
        if (currentSentence.length > 0) {
            sentences.push(currentSentence.join(' ').trim());
        }
        // 第三步：生成清理後的段落
        const cleanedSegments = [];
        let segmentIndex = 0;
        for (const sentence of sentences) {
            if (sentence.length > 10) { // 只保留有意義的句子
                cleanedSegments.push({
                    text: sentence,
                    start: segmentIndex * 5, // 估算時間
                    end: (segmentIndex + 1) * 5,
                    duration: 5
                });
                segmentIndex++;
            }
        }
        // 第四步：生成優化的純文本
        const optimizedText = sentences
            .filter(s => s.length > 10)
            .map(s => s.charAt(0).toUpperCase() + s.slice(1)) // 首字母大寫
            .join('. ')
            .replace(/\s+/g, ' ')
            .trim();
        return {
            cleanedSegments,
            optimizedText: optimizedText + (optimizedText.endsWith('.') ? '' : '.')
        };
    }
    /**
     * 進一步優化文本，減少token浪費
     */
    optimizeFullText(segments) {
        const { optimizedText } = this.aggressiveCleanTranscript(segments);
        return optimizedText;
    }
    /**
     * 下載並解析字幕（使用獨立的 Python 腳本）
     */
    async downloadAndParseSubtitles(videoUrl, language) {
        return new Promise((resolve, reject) => {
            const scriptPath = path.join(__dirname, '..', '..', 'src', 'clean_transcript.py');
            const args = [scriptPath, videoUrl, language];
            const process = spawn(this.pythonPath, args);
            let stdout = '';
            let stderr = '';
            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            process.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`字幕下載失敗: ${stderr}`));
                    return;
                }
                try {
                    const segments = JSON.parse(stdout.trim());
                    resolve(segments);
                }
                catch (error) {
                    reject(new Error(`字幕解析失敗: ${error instanceof Error ? error.message : String(error)}`));
                }
            });
            process.on('error', (error) => {
                reject(new Error(`進程執行失敗: ${error instanceof Error ? error.message : String(error)}`));
            });
        });
    }
    /**
     * 格式化輸出
     */
    formatOutput(result, format) {
        switch (format) {
            case 'text':
                return result.fullText;
            case 'vtt':
                return this.formatAsVTT(result.segments);
            case 'srt':
                return this.formatAsSRT(result.segments);
            case 'segments':
            default:
                return JSON.stringify(result.segments, null, 2);
        }
    }
    /**
     * 格式化為VTT
     */
    formatAsVTT(segments) {
        let vtt = 'WEBVTT\n\n';
        segments.forEach((segment, index) => {
            const startTime = this.secondsToVTTTime(segment.start);
            const endTime = this.secondsToVTTTime(segment.end);
            vtt += `${index + 1}\n`;
            vtt += `${startTime} --> ${endTime}\n`;
            vtt += `${segment.text}\n\n`;
        });
        return vtt;
    }
    /**
     * 格式化為SRT
     */
    formatAsSRT(segments) {
        let srt = '';
        segments.forEach((segment, index) => {
            const startTime = this.secondsToSRTTime(segment.start);
            const endTime = this.secondsToSRTTime(segment.end);
            srt += `${index + 1}\n`;
            srt += `${startTime} --> ${endTime}\n`;
            srt += `${segment.text}\n\n`;
        });
        return srt;
    }
    /**
     * 秒數轉VTT時間格式
     */
    secondsToVTTTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    }
    /**
     * 秒數轉SRT時間格式
     */
    secondsToSRTTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
    }
    /**
     * 檢查yt_dlp是否可用
     */
    async checkYtDlpAvailability() {
        return new Promise((resolve) => {
            const process = spawn(this.pythonPath, ['-c', 'import yt_dlp; print("OK")']);
            process.on('close', (code) => {
                resolve(code === 0);
            });
            process.on('error', () => {
                resolve(false);
            });
        });
    }
}
