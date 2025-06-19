/**
 * 統一緩存管理器
 * 負責本地知識庫的存儲、檢索和維護
 */

import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';

export interface CacheConfig {
  maxStorageGB: number;
  cleanupThresholdGB: number;
  retention: Record<string, string>;
  autoCleanup: {
    enabled: boolean;
    schedule: string;
    preserveRecentDays: number;
  };
}

export interface CacheStats {
  totalSizeGB: number;
  fileCount: number;
  lastCleanup: Date;
  storageBreakdown: Record<string, number>;
}

export interface CacheEntry {
  id: string;
  type: 'arxiv' | 'wikipedia' | 'scholar';
  subtype: 'raw' | 'processed' | 'analyzed';
  filePath: string;
  metadata: any;
  createdAt: Date;
  lastAccessed: Date;
  sizeBytes: number;
  checksum: string;
}

export class CacheManager {
  private basePath: string;
  private config: CacheConfig;
  private indexPath: string;

  constructor(basePath: string = './cache') {
    this.basePath = path.resolve(basePath);
    this.indexPath = path.join(this.basePath, 'system', 'cache_index.json');
    this.config = this.loadConfig();
    this.init();
  }

  /**
   * 異步初始化
   */
  private async init(): Promise<void> {
    await this.ensureDirectories();
    // v2.0 自動執行數據遷移（僅在必要時）
    await this.checkAndMigrateData();
  }

  /**
   * 確保所有必要的目錄存在 - v2.0 對齊存儲架構
   */
  private async ensureDirectories(): Promise<void> {
    console.log('🏗️ v2.0 初始化標準存儲架構...');
    
    const directories = [
      // arXiv 結構 - 按年月組織
      'arxiv/raw/2024/01', 'arxiv/raw/2024/02', 'arxiv/raw/2024/03', 'arxiv/raw/2024/04',
      'arxiv/raw/2024/05', 'arxiv/raw/2024/06', 'arxiv/raw/2024/07', 'arxiv/raw/2024/08',
      'arxiv/raw/2024/09', 'arxiv/raw/2024/10', 'arxiv/raw/2024/11', 'arxiv/raw/2024/12',
      'arxiv/raw/2025/01', 'arxiv/raw/2025/02', 'arxiv/raw/2025/03', 'arxiv/raw/2025/04',
      'arxiv/raw/2025/05', 'arxiv/raw/2025/06', 'arxiv/raw/2025/07', 'arxiv/raw/2025/08',
      'arxiv/raw/2025/09', 'arxiv/raw/2025/10', 'arxiv/raw/2025/11', 'arxiv/raw/2025/12',
      'arxiv/texts', 'arxiv/analyses', 'arxiv/index',
      
      // Wikipedia 結構 - 按語言組織
      'wikipedia/raw/zh', 'wikipedia/raw/en', 'wikipedia/raw/ja', 'wikipedia/raw/de',
      'wikipedia/processed/zh', 'wikipedia/processed/en', 'wikipedia/processed/ja', 'wikipedia/processed/de',
      'wikipedia/cross_language', 'wikipedia/networks',
      
      // Scholar 結構 - 按內容類型組織
      'scholar/papers', 'scholar/authors', 'scholar/networks/citation_networks',
      'scholar/networks/author_networks', 'scholar/networks/institution_networks',
      'scholar/trends/field_evolution', 'scholar/trends/emerging_topics',
      'scholar/trends/declining_topics', 'scholar/trends/breakthrough_papers',
      
      // 整合結構
      'integrated/topics', 'integrated/reports', 'integrated/analyses', 'integrated/knowledge_graphs',
      
      // 系統結構
      'system/config', 'system/logs', 'system/stats', 'system/maintenance'
    ];

    for (const dir of directories) {
      await fs.ensureDir(path.join(this.basePath, dir));
    }
    
    console.log(`✅ 創建了 ${directories.length} 個標準目錄`);
  }

  /**
   * 加載緩存配置
   */
  private loadConfig(): CacheConfig {
    try {
      const configPath = path.join(this.basePath, 'system', 'config', 'cache_policy.json');
      const config = fs.readJsonSync(configPath);
      return config.cache_policy;
    } catch (error) {
      console.warn('使用默認緩存配置');
      return {
        maxStorageGB: 10,
        cleanupThresholdGB: 8,
        retention: {
          arxiv_pdfs: '12_months',
          wikipedia_pages: '6_months',
          analyses: '24_months',
          reports: 'permanent'
        },
        autoCleanup: {
          enabled: true,
          schedule: 'weekly',
          preserveRecentDays: 30
        }
      };
    }
  }

  /**
   * 存儲文件到緩存 - v2.0 使用標準存儲架構
   */
  async store(
    type: 'arxiv' | 'wikipedia' | 'scholar',
    subtype: 'raw' | 'processed' | 'analyzed',
    id: string,
    content: Buffer | string,
    metadata: any = {}
  ): Promise<string> {
    // v2.0 使用標準目錄結構
    const standardPath = this.getStandardPath(type, subtype, id, metadata);
    const fileName = this.generateStandardFileName(id, subtype, metadata);
    const filePath = path.join(this.basePath, standardPath, fileName);
    
    // 確保目錄存在
    await fs.ensureDir(path.dirname(filePath));
    
    // 寫入文件
    if (typeof content === 'string') {
      await fs.writeFile(filePath, content, 'utf8');
    } else {
      await fs.writeFile(filePath, content);
    }

    // 計算校驗和
    const checksum = this.calculateChecksum(content);
    const stats = await fs.stat(filePath);
    
    // 更新索引
    const entry: CacheEntry = {
      id,
      type,
      subtype,
      filePath,
      metadata: {
        ...metadata,
        standardPath,
        storageVersion: '2.0.0'
      },
      createdAt: new Date(),
      lastAccessed: new Date(),
      sizeBytes: stats.size,
      checksum
    };
    
    await this.updateIndex(entry);
    
    console.log(`✅ v2.0 已存儲: ${standardPath}/${fileName} (${this.formatSize(stats.size)})`);
    return filePath;
  }

  /**
   * 從緩存檢索文件
   */
  async retrieve(
    type: 'arxiv' | 'wikipedia' | 'scholar',
    subtype: 'raw' | 'processed' | 'analyzed',
    id: string
  ): Promise<{ content: Buffer; metadata: any; filePath: string } | null> {
    const entry = await this.findEntry(type, subtype, id);
    if (!entry) {
      return null;
    }

    try {
      // 檢查文件是否存在
      if (!await fs.pathExists(entry.filePath)) {
        console.warn(`文件不存在: ${entry.filePath}`);
        await this.removeFromIndex(entry.id);
        return null;
      }

      // 讀取文件
      const content = await fs.readFile(entry.filePath);
      
      // 驗證校驗和
      const checksum = this.calculateChecksum(content);
      if (checksum !== entry.checksum) {
        console.warn(`校驗和不匹配: ${entry.filePath}`);
        return null;
      }

      // 更新最後訪問時間
      entry.lastAccessed = new Date();
      await this.updateIndex(entry);

      console.log(`📖 已檢索: ${type}/${subtype}/${id}`);
      return {
        content,
        metadata: entry.metadata,
        filePath: entry.filePath
      };
    } catch (error) {
      console.error(`檢索失敗: ${entry.filePath}`, error);
      return null;
    }
  }

  /**
   * 檢查緩存中是否存在文件
   */
  async exists(
    type: 'arxiv' | 'wikipedia' | 'scholar',
    subtype: 'raw' | 'processed' | 'analyzed',
    id: string
  ): Promise<boolean> {
    const entry = await this.findEntry(type, subtype, id);
    if (!entry) return false;
    
    return await fs.pathExists(entry.filePath);
  }

  /**
   * 獲取緩存統計信息
   */
  async getStats(): Promise<CacheStats> {
    const index = await this.loadIndex();
    const entries = Object.values(index);
    
    let totalSize = 0;
    const breakdown: Record<string, number> = {};
    
    for (const entry of entries) {
      totalSize += entry.sizeBytes;
      const key = `${entry.type}_${entry.subtype}`;
      breakdown[key] = (breakdown[key] || 0) + entry.sizeBytes;
    }

    return {
      totalSizeGB: totalSize / (1024 * 1024 * 1024),
      fileCount: entries.length,
      lastCleanup: new Date(), // TODO: 從配置中讀取
      storageBreakdown: breakdown
    };
  }

  /**
   * 執行緩存清理
   */
  async cleanup(forceCleanup: boolean = false): Promise<void> {
    const stats = await this.getStats();
    
    if (!forceCleanup && stats.totalSizeGB < this.config.cleanupThresholdGB) {
      console.log('無需清理緩存');
      return;
    }

    console.log('🧹 開始緩存清理...');
    
    const index = await this.loadIndex();
    const entries = Object.values(index);
    
    // 按優先級排序（低優先級先刪除）
    entries.sort((a, b) => {
      const priorityA = this.calculatePriority(a);
      const priorityB = this.calculatePriority(b);
      return priorityA - priorityB;
    });

    let cleaned = 0;
    let freedSpace = 0;
    
    for (const entry of entries) {
      if (stats.totalSizeGB - (freedSpace / (1024 * 1024 * 1024)) < this.config.maxStorageGB * 0.7) {
        break;
      }

      try {
        if (await fs.pathExists(entry.filePath)) {
          await fs.remove(entry.filePath);
          freedSpace += entry.sizeBytes;
          cleaned++;
        }
        await this.removeFromIndex(entry.id);
      } catch (error) {
        console.warn(`清理失敗: ${entry.filePath}`, error);
      }
    }

    console.log(`🧹 清理完成: 刪除 ${cleaned} 個文件，釋放 ${this.formatSize(freedSpace)}`);
  }

  /**
   * v2.0 檢查並執行數據遷移
   */
  private async checkAndMigrateData(): Promise<void> {
    try {
      const migrationFlagPath = path.join(this.basePath, 'system', 'migration_v2_completed.flag');
      
      if (await fs.pathExists(migrationFlagPath)) {
        console.log('📦 v2.0 數據遷移已完成，跳過');
        return;
      }

      console.log('🔄 檢測到舊格式數據，開始 v2.0 遷移...');
      const migratedCount = await this.migrateToStandardStructure();
      
      // 確保目錄存在
      await fs.ensureDir(path.dirname(migrationFlagPath));
      
      // 創建遷移完成標記
      await fs.writeFile(migrationFlagPath, JSON.stringify({
        migrationDate: new Date().toISOString(),
        version: '2.0.0',
        migratedFiles: migratedCount
      }), 'utf8');
      
      console.log('✅ v2.0 數據遷移完成');
    } catch (error) {
      console.warn('⚠️ 數據遷移過程中發生錯誤:', error);
    }
  }

  /**
   * v2.0 將現有數據遷移到標準結構
   */
  private async migrateToStandardStructure(): Promise<number> {
    const index = await this.loadIndex();
    const entries = Object.values(index);
    let migratedCount = 0;

    console.log(`📦 發現 ${entries.length} 個文件需要遷移`);

    for (const entry of entries) {
      try {
        // 檢查文件是否已使用新格式
        if (entry.metadata?.storageVersion === '2.0.0') {
          continue;
        }

        // 檢查原文件是否存在
        if (!await fs.pathExists(entry.filePath)) {
          console.warn(`原文件不存在: ${entry.filePath}`);
          continue;
        }

        // 計算新的標準路徑
        const standardPath = this.getStandardPath(entry.type, entry.subtype, entry.id, entry.metadata);
        const fileName = this.generateStandardFileName(entry.id, entry.subtype, entry.metadata);
        const newFilePath = path.join(this.basePath, standardPath, fileName);

        // 如果新路徑與舊路徑相同，跳過
        if (entry.filePath === newFilePath) {
          continue;
        }

        // 確保新目錄存在
        await fs.ensureDir(path.dirname(newFilePath));

        // 移動文件到新位置
        await fs.move(entry.filePath, newFilePath);

        // 更新索引記錄
        entry.filePath = newFilePath;
        entry.metadata = {
          ...entry.metadata,
          standardPath,
          storageVersion: '2.0.0',
          migratedAt: new Date().toISOString()
        };

        migratedCount++;
        console.log(`📦 遷移: ${entry.id} -> ${standardPath}/${fileName}`);
        
      } catch (error) {
        console.warn(`遷移失敗: ${entry.id}`, error);
      }
    }

    // 保存更新後的索引
    if (migratedCount > 0) {
      await this.saveIndex(index);
      console.log(`✅ 成功遷移 ${migratedCount} 個文件到標準結構`);
    }

    // 清理空的舊目錄
    await this.cleanupEmptyDirectories();
    
    return migratedCount;
  }

  /**
   * 清理空的舊目錄
   */
  private async cleanupEmptyDirectories(): Promise<void> {
    try {
      const oldPaths = [
        'arxiv/raw', 'arxiv/texts', 'arxiv/analyses',
        'wikipedia/raw', 'wikipedia/processed', 
        'scholar/papers', 'scholar/authors', 'scholar/networks'
      ];

      for (const oldPath of oldPaths) {
        const fullPath = path.join(this.basePath, oldPath);
        if (await fs.pathExists(fullPath)) {
          try {
            const entries = await fs.readdir(fullPath);
            if (entries.length === 0) {
              await fs.remove(fullPath);
              console.log(`🗑️ 清理空目錄: ${oldPath}`);
            }
          } catch (error) {
            // 忽略清理錯誤
          }
        }
      }
    } catch (error) {
      console.warn('清理舊目錄時發生錯誤:', error);
    }
  }

  // ===== 私有輔助方法 =====

  /**
   * v2.0 獲取標準存儲路徑
   */
  private getStandardPath(
    type: 'arxiv' | 'wikipedia' | 'scholar',
    subtype: 'raw' | 'processed' | 'analyzed',
    id: string,
    metadata: any = {}
  ): string {
    switch (type) {
      case 'arxiv':
        if (subtype === 'raw') {
          // arXiv PDF 按年月組織: arxiv/raw/2024/05/
          const date = metadata.publishedDate ? new Date(metadata.publishedDate) : new Date();
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          return `arxiv/raw/${year}/${month}`;
        } else {
          // 文本和分析按論文ID組織: arxiv/texts/2401.12345/
          return `arxiv/${subtype}/${this.sanitizeId(id)}`;
        }
      
      case 'wikipedia':
        if (subtype === 'raw' || subtype === 'processed') {
          // Wikipedia 按語言組織: wikipedia/processed/zh/人工智能/
          const language = metadata.language || 'en';
          const topic = metadata.topic || this.sanitizeId(id);
          return `wikipedia/${subtype}/${language}/${topic}`;
        } else {
          return `wikipedia/${subtype}`;
        }
      
      case 'scholar':
        if (subtype === 'raw') {
          // Scholar 論文: scholar/papers/s2-corpus-123456/
          return `scholar/papers/${this.sanitizeId(id)}`;
        } else if (subtype === 'processed') {
          // 學者檔案: scholar/authors/author_123/
          return `scholar/authors/${this.sanitizeId(id)}`;
        } else {
          // 分析結果: scholar/networks/citation_networks/
          const networkType = metadata.networkType || 'citation_networks';
          return `scholar/networks/${networkType}`;
        }
      
      default:
        // 向下兼容舊格式
        return `${type}/${subtype}`;
    }
  }

  /**
   * v2.0 生成標準文件名
   */
  private generateStandardFileName(id: string, subtype: string, metadata: any = {}): string {
    const sanitized = this.sanitizeId(id);
    
    switch (subtype) {
      case 'raw':
        if (metadata.fileType === 'pdf') {
          return `${sanitized}.pdf`;
        } else if (metadata.fileType === 'html') {
          return 'raw.html';
        } else {
          return `${sanitized}.${this.getFileExtension(subtype)}`;
        }
      
      case 'processed':
        if (metadata.contentType === 'clean_text') {
          return 'clean_text.txt';
        } else if (metadata.contentType === 'infobox') {
          return 'infobox.json';
        } else if (metadata.contentType === 'sections') {
          return 'sections.json';
        } else {
          return `${sanitized}_processed.${this.getFileExtension(subtype)}`;
        }
      
      case 'analyzed':
        if (metadata.analysisType) {
          return `${metadata.analysisType}.json`;
        } else {
          return `${sanitized}_analysis.json`;
        }
      
      default:
        const timestamp = Date.now();
        return `${sanitized}_${timestamp}.${this.getFileExtension(subtype)}`;
    }
  }

  /**
   * 清理ID中的特殊字符
   */
  private sanitizeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9.-]/g, '_');
  }

  private generateFileName(id: string, subtype: string): string {
    const sanitized = id.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();
    return `${sanitized}_${timestamp}.${this.getFileExtension(subtype)}`;
  }

  private getFileExtension(subtype: string): string {
    switch (subtype) {
      case 'raw': return 'bin';
      case 'processed': return 'txt';
      case 'analyzed': return 'json';
      default: return 'dat';
    }
  }

  private calculateChecksum(content: Buffer | string): string {
    const data = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;
    return crypto.createHash('md5').update(data).digest('hex');
  }

  private async loadIndex(): Promise<Record<string, CacheEntry>> {
    try {
      if (await fs.pathExists(this.indexPath)) {
        return await fs.readJson(this.indexPath);
      }
    } catch (error) {
      console.warn('讀取索引失敗，創建新索引');
    }
    return {};
  }

  private async saveIndex(index: Record<string, CacheEntry>): Promise<void> {
    await fs.ensureDir(path.dirname(this.indexPath));
    await fs.writeJson(this.indexPath, index, { spaces: 2 });
  }

  private async updateIndex(entry: CacheEntry): Promise<void> {
    const index = await this.loadIndex();
    index[entry.id] = entry;
    await this.saveIndex(index);
  }

  private async removeFromIndex(id: string): Promise<void> {
    const index = await this.loadIndex();
    delete index[id];
    await this.saveIndex(index);
  }

  private async findEntry(
    type: string,
    subtype: string,
    id: string
  ): Promise<CacheEntry | null> {
    const index = await this.loadIndex();
    const entry = index[id];
    
    if (entry && entry.type === type && entry.subtype === subtype) {
      return entry;
    }
    
    return null;
  }

  private calculatePriority(entry: CacheEntry): number {
    let priority = 0;
    
    // 最近訪問的優先級高
    const daysSinceAccess = (Date.now() - entry.lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceAccess < 7) priority += 3;
    else if (daysSinceAccess < 30) priority += 1;
    else priority -= 1;
    
    // 大文件優先級低
    if (entry.sizeBytes > 10 * 1024 * 1024) priority -= 1;
    
    // 分析結果優先級高
    if (entry.subtype === 'analyzed') priority += 2;
    
    return priority;
  }

  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}