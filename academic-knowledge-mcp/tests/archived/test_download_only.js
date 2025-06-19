#!/usr/bin/env node

/**
 * 簡化測試 - 只測試 PDF 下載功能
 */

import { CacheManager } from './dist/services/CacheManager.js';
import { PdfDownloader } from './dist/services/PdfDownloader.js';

async function testDownloadOnly() {
  console.log('🧪 測試開始：真實 PDF 下載功能');
  console.log('=' .repeat(50));
  
  try {
    // 初始化緩存管理器和下載器
    console.log('📚 初始化系統組件...');
    const cacheManager = new CacheManager();
    const pdfDownloader = new PdfDownloader(cacheManager);
    console.log('✅ 初始化完成\n');
    
    // 測試論文 ID
    const testArxivId = '2005.11401'; // RAG 經典論文
    console.log(`🎯 測試論文: ${testArxivId}`);
    console.log(`📄 Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks`);
    console.log();
    
    // 檢查是否已經下載過
    if (await cacheManager.exists('arxiv', 'raw', testArxivId)) {
      console.log('✅ 文件已存在於緩存中');
      const cached = await cacheManager.retrieve('arxiv', 'raw', testArxivId);
      if (cached) {
        console.log(`📄 已緩存文件大小: ${cached.content.length} bytes`);
        console.log(`🗂️  文件路徑: ${cached.filePath}`);
        console.log(`📊 元數據:`, JSON.stringify(cached.metadata, null, 2));
      }
    } else {
      console.log('📥 開始下載 PDF...');
      const downloadResult = await pdfDownloader.downloadPdf(testArxivId);
      
      if (downloadResult.success) {
        console.log('✅ 下載成功！');
        console.log(`📄 文件大小: ${downloadResult.data.fileSize} bytes`);
        console.log(`⏱️  下載時間: ${downloadResult.data.downloadTime}ms`);
        console.log(`📁 存儲路徑: ${downloadResult.data.filePath}`);
      } else {
        console.error('❌ 下載失敗:', downloadResult.error?.message);
        return;
      }
    }
    
    // 獲取緩存統計
    console.log('\n📊 緩存統計:');
    const stats = await cacheManager.getStats();
    console.log(`💾 總存儲: ${stats.totalSizeGB.toFixed(3)} GB`);
    console.log(`📁 文件數量: ${stats.fileCount}`);
    console.log(`📈 存儲分佈:`);
    for (const [type, size] of Object.entries(stats.storageBreakdown)) {
      console.log(`  - ${type}: ${(size / (1024 * 1024)).toFixed(2)} MB`);
    }
    
    // 驗證 PDF 文件
    console.log('\n🔍 驗證下載的 PDF 文件...');
    const pdfFile = await cacheManager.retrieve('arxiv', 'raw', testArxivId);
    if (pdfFile) {
      const header = pdfFile.content.slice(0, 8).toString();
      console.log(`📋 文件頭: ${header}`);
      
      if (header.startsWith('%PDF')) {
        console.log('✅ 這是一個有效的 PDF 文件！');
        console.log(`📄 PDF 版本: ${header}`);
      } else {
        console.log('⚠️  文件格式可能有問題');
      }
    }
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🎉 下載測試完成！');
  console.log('📈 成果: 成功實現真實 PDF 下載和本地存儲');
  console.log('💾 文件已安全存儲在本地緩存系統中');
}

// 運行測試
testDownloadOnly().catch(console.error);