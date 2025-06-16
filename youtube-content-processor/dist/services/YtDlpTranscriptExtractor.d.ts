export interface TranscriptSegment {
    text: string;
    start: number;
    duration: number;
    end: number;
}
export interface VideoInfo {
    id: string;
    title: string;
    channel: string;
    duration: number;
    viewCount?: number;
    description?: string;
    publishDate?: string;
}
export interface CaptionInfo {
    language: string;
    name: string;
    isAutomatic: boolean;
    url?: string;
}
export interface TranscriptResult {
    videoInfo: VideoInfo;
    segments: TranscriptSegment[];
    fullText: string;
    captionInfo: CaptionInfo;
}
/**
 * 基於yt_dlp的YouTube字幕提取器
 * 使用可靠的yt_dlp Python庫來繞過YouTube的限制
 */
export declare class YtDlpTranscriptExtractor {
    private pythonPath;
    private scriptPath;
    private tempDir;
    constructor(pythonPath?: string);
    /**
     * 提取YouTube影片字幕
     */
    extract(videoUrl: string, options?: {
        languagePreference?: string[];
        includeAutomatic?: boolean;
        outputFormat?: 'segments' | 'text' | 'vtt' | 'srt';
    }): Promise<TranscriptResult>;
    /**
     * 獲取影片基本資訊
     */
    private getVideoInfo;
    /**
     * 獲取可用字幕列表
     */
    getAvailableCaptions(videoUrl: string): Promise<CaptionInfo[]>;
    /**
     * 選擇最佳字幕語言
     */
    private selectBestCaption;
    /**
     * 清理字幕內容，去除重複和優化格式
     */
    private cleanTranscriptSegments;
    /**
     * 激進的字幕清理和優化，專門處理 YouTube 重複字幕
     */
    private aggressiveCleanTranscript;
    /**
     * 進一步優化文本，減少token浪費
     */
    private optimizeFullText;
    /**
     * 下載並解析字幕（使用獨立的 Python 腳本）
     */
    private downloadAndParseSubtitles;
    /**
     * 格式化輸出
     */
    formatOutput(result: TranscriptResult, format: 'segments' | 'text' | 'vtt' | 'srt'): string;
    /**
     * 格式化為VTT
     */
    private formatAsVTT;
    /**
     * 格式化為SRT
     */
    private formatAsSRT;
    /**
     * 秒數轉VTT時間格式
     */
    private secondsToVTTTime;
    /**
     * 秒數轉SRT時間格式
     */
    private secondsToSRTTime;
    /**
     * 檢查yt_dlp是否可用
     */
    checkYtDlpAvailability(): Promise<boolean>;
}
