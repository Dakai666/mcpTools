/**
 * PDF 下載器
 * 真實下載 arXiv PDF 文件到本地存儲
 */

import fs from 'fs-extra';
import path from 'path';
import fetch from 'node-fetch';
import { CacheManager } from './CacheManager.js';
import { APIResponse } from '../types/index.js';

export interface DownloadConfig {
  timeoutSeconds: number;
  retryAttempts: number;
  retryDelaySeconds: number;
  userAgent: string;
  maxFileSizeMB: number;
  concurrentDownloads: number;
}

export interface DownloadProgress {
  paperId: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  progress: number; // 0-1
  downloadedBytes: number;
  totalBytes: number;
  error?: string;
}

export interface DownloadResult {
  paperId: string;
  success: boolean;
  filePath?: string;
  fileSize?: number;
  downloadTime?: number;
  error?: string;
}

export class PdfDownloader {
  private cacheManager: CacheManager;
  private config: DownloadConfig;
  private activeDownloads: Map<string, DownloadProgress>;
  private downloadQueue: string[];

  constructor(cacheManager: CacheManager) {
    this.cacheManager = cacheManager;
    this.config = this.loadConfig();
    this.activeDownloads = new Map();
    this.downloadQueue = [];
  }

  /**
   * 下載單個 PDF 文件
   */
  async downloadPdf(arxivId: string): Promise<APIResponse<DownloadResult>> {
    const startTime = Date.now();
    
    try {
      console.log(`📥 開始下載: ${arxivId}`);
      
      // 檢查是否已經存在
      if (await this.cacheManager.exists('arxiv', 'raw', arxivId)) {
        console.log(`✅ 文件已存在: ${arxivId}`);
        return {
          success: true,
          data: {
            paperId: arxivId,
            success: true,
            downloadTime: 0
          },
          metadata: {
            timestamp: new Date(),
            processingTime: Date.now() - startTime,
            version: '2.0.0'
          }
        };
      }

      // 構建 PDF URL
      const pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`;
      
      // 初始化下載進度
      this.activeDownloads.set(arxivId, {
        paperId: arxivId,
        status: 'downloading',
        progress: 0,
        downloadedBytes: 0,
        totalBytes: 0
      });

      // 執行下載
      const result = await this.performDownload(arxivId, pdfUrl);
      
      // 更新進度
      this.activeDownloads.delete(arxivId);
      
      console.log(`✅ 下載完成: ${arxivId} (${result.fileSize} bytes, ${result.downloadTime}ms)`);

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
          version: '2.0.0'
        }
      };

    } catch (error) {
      console.error(`❌ 下載失敗: ${arxivId}`, error);
      
      // 清理失敗的下載
      this.activeDownloads.delete(arxivId);
      
      return {
        success: false,
        error: {
          code: 'PDF_DOWNLOAD_ERROR',
          message: error instanceof Error ? error.message : 'Unknown download error',
          source: 'pdf_downloader',
          retryable: true
        },
        metadata: {
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
          version: '2.0.0'
        }
      };
    }
  }

  /**
   * 批量下載 PDF 文件
   */
  async downloadBatch(arxivIds: string[]): Promise<APIResponse<DownloadResult[]>> {
    const startTime = Date.now();
    const results: DownloadResult[] = [];
    
    try {
      console.log(`📥 批量下載: ${arxivIds.length} 個文件`);
      
      // 分批處理以控制並發
      const batchSize = this.config.concurrentDownloads;
      
      for (let i = 0; i < arxivIds.length; i += batchSize) {
        const batch = arxivIds.slice(i, i + batchSize);
        const batchPromises = batch.map(id => this.downloadPdf(id));
        
        const batchResults = await Promise.allSettled(batchPromises);
        
        for (const result of batchResults) {
          if (result.status === 'fulfilled' && result.value.success) {
            results.push(result.value.data!);
          } else {
            const reason = result.status === 'rejected' ? result.reason : result.value.error;
            results.push({
              paperId: 'unknown',
              success: false,
              error: reason?.message || 'Unknown error'
            });
          }
        }
        
        // 批次間暫停以避免過度負載
        if (i + batchSize < arxivIds.length) {
          await this.delay(1000);
        }
      }

      const successful = results.filter(r => r.success).length;
      console.log(`✅ 批量下載完成: ${successful}/${arxivIds.length} 成功`);

      return {
        success: true,
        data: results,
        metadata: {
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
          version: '2.0.0'
        }
      };

    } catch (error) {
      console.error('批量下載失敗', error);
      
      return {
        success: false,
        error: {
          code: 'BATCH_DOWNLOAD_ERROR',
          message: error instanceof Error ? error.message : 'Unknown batch error',
          source: 'pdf_downloader',
          retryable: true
        },
        metadata: {
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
          version: '2.0.0'
        }
      };
    }
  }

  /**
   * 獲取下載進度
   */
  getDownloadProgress(arxivId?: string): DownloadProgress | DownloadProgress[] {
    if (arxivId) {
      return this.activeDownloads.get(arxivId) || {
        paperId: arxivId,
        status: 'pending',
        progress: 0,
        downloadedBytes: 0,
        totalBytes: 0
      };
    }
    
    return Array.from(this.activeDownloads.values());
  }

  /**
   * 取消下載
   */
  async cancelDownload(arxivId: string): Promise<boolean> {
    const progress = this.activeDownloads.get(arxivId);
    if (progress) {
      progress.status = 'failed';
      progress.error = 'Cancelled by user';
      this.activeDownloads.delete(arxivId);
      return true;
    }
    return false;
  }

  // ===== 私有方法 =====

  private async performDownload(arxivId: string, url: string): Promise<DownloadResult> {
    const startTime = Date.now();
    let attempt = 0;
    
    while (attempt < this.config.retryAttempts) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': this.config.userAgent
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentLength = response.headers.get('content-length');
        const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
        
        // 檢查文件大小
        if (totalBytes > this.config.maxFileSizeMB * 1024 * 1024) {
          throw new Error(`文件過大: ${totalBytes} bytes`);
        }

        // 更新進度
        const progress = this.activeDownloads.get(arxivId);
        if (progress) {
          progress.totalBytes = totalBytes;
        }

        // 讀取響應體
        const chunks: Buffer[] = [];
        let downloadedBytes = 0;

        const body = response.body;
        if (!body) {
          throw new Error('Response body is null');
        }

        // 逐塊讀取並更新進度
        for await (const chunk of body) {
          const buffer = Buffer.from(chunk);
          chunks.push(buffer);
          downloadedBytes += buffer.length;
          
          // 更新進度
          if (progress) {
            progress.downloadedBytes = downloadedBytes;
            progress.progress = totalBytes > 0 ? downloadedBytes / totalBytes : 0;
          }
        }

        const pdfBuffer = Buffer.concat(chunks);
        
        // 驗證 PDF 格式
        if (!this.validatePdfFormat(pdfBuffer)) {
          throw new Error('Invalid PDF format');
        }

        // 存儲到緩存
        const filePath = await this.cacheManager.store('arxiv', 'raw', arxivId, pdfBuffer, {
          url,
          downloadDate: new Date(),
          fileSize: pdfBuffer.length,
          contentType: response.headers.get('content-type') || 'application/pdf'
        });

        return {
          paperId: arxivId,
          success: true,
          filePath,
          fileSize: pdfBuffer.length,
          downloadTime: Date.now() - startTime
        };

      } catch (error) {
        attempt++;
        console.warn(`下載嘗試 ${attempt}/${this.config.retryAttempts} 失敗: ${arxivId}`, error);
        
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelaySeconds * 1000);
        } else {
          throw error;
        }
      }
    }

    throw new Error(`All ${this.config.retryAttempts} download attempts failed`);
  }

  private validatePdfFormat(buffer: Buffer): boolean {
    // 檢查 PDF 文件頭
    const pdfHeader = buffer.slice(0, 4).toString();
    return pdfHeader === '%PDF';
  }

  private loadConfig(): DownloadConfig {
    try {
      // TODO: 從配置文件加載
      return {
        timeoutSeconds: 120,
        retryAttempts: 3,
        retryDelaySeconds: 5,
        userAgent: 'Academic-Knowledge-MCP/2.0.0 (Research Tool)',
        maxFileSizeMB: 50,
        concurrentDownloads: 3
      };
    } catch (error) {
      console.warn('使用默認下載配置');
      return {
        timeoutSeconds: 120,
        retryAttempts: 3,
        retryDelaySeconds: 5,
        userAgent: 'Academic-Knowledge-MCP/2.0.0 (Research Tool)',
        maxFileSizeMB: 50,
        concurrentDownloads: 3
      };
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}