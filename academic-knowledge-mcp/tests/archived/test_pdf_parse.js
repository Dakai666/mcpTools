#!/usr/bin/env node

/**
 * 測試 PDF 解析功能
 */

import { CacheManager } from './dist/services/CacheManager.js';
import { PdfTextExtractor } from './dist/services/PdfTextExtractor.js';

async function testPdfParsing() {
  console.log('🧪 測試開始：PDF 文本解析功能');
  console.log('=' .repeat(50));
  
  try {
    // 初始化組件
    console.log('📚 初始化系統組件...');
    const cacheManager = new CacheManager();
    const textExtractor = new PdfTextExtractor(cacheManager);
    console.log('✅ 初始化完成\n');
    
    // 測試論文 ID
    const testArxivId = '2005.11401';
    console.log(`🎯 測試論文: ${testArxivId}`);
    console.log(`📄 RAG 經典論文 - 知識密集型NLP任務的檢索增強生成`);
    
    // 檢查 PDF 文件是否存在
    if (!await cacheManager.exists('arxiv', 'raw', testArxivId)) {
      console.log('❌ PDF 文件不存在，請先運行下載測試');
      return;
    }
    
    console.log('✅ PDF 文件存在，開始解析...\n');
    
    // 執行文本提取
    console.log('🔍 開始提取 PDF 文本內容...');
    const extractResult = await textExtractor.extractText(testArxivId);
    
    if (extractResult.success && extractResult.data) {
      const result = extractResult.data;
      const content = result.content;
      
      console.log('✅ 文本提取成功！\n');
      
      console.log('📊 提取統計:');
      console.log(`  ⏱️  解析時間: ${result.extractionTime}ms`);
      console.log(`  📄 總頁數: ${content.pageCount}`);
      console.log(`  📝 總字數: ${content.wordCount.toLocaleString()}`);
      console.log(`  📖 章節數: ${content.sections.length}`);
      console.log(`  🖼️  圖表數: ${content.figures.length}`);
      console.log(`  📊 表格數: ${content.tables.length}`);
      console.log(`  📚 參考文獻: ${content.references.length}`);
      
      console.log('\n📑 元數據信息:');
      if (content.metadata.title) {
        console.log(`  📋 標題: ${content.metadata.title}`);
      }
      if (content.metadata.author) {
        console.log(`  👤 作者: ${content.metadata.author}`);
      }
      if (content.metadata.creationDate) {
        console.log(`  📅 創建日期: ${content.metadata.creationDate.toLocaleDateString()}`);
      }
      
      console.log('\n🗂️  章節結構:');
      content.sections.slice(0, 8).forEach((section, index) => {
        const indent = '  '.repeat(section.level);
        const icon = section.level === 1 ? '●' : section.level === 2 ? '○' : '◦';
        console.log(`${indent}${icon} ${section.title}`);
        console.log(`${indent}  📝 ${section.wordCount} 詞, 第 ${section.startPage} 頁`);
      });
      
      if (content.sections.length > 8) {
        console.log(`  ... 還有 ${content.sections.length - 8} 個章節`);
      }
      
      console.log('\n📝 內容示例 (前 300 字符):');
      console.log('─'.repeat(50));
      console.log(content.rawText.substring(0, 300) + '...');
      console.log('─'.repeat(50));
      
      if (content.figures.length > 0) {
        console.log('\n🖼️  圖表信息:');
        content.figures.slice(0, 3).forEach(figure => {
          console.log(`  - 圖 ${figure.figureNumber}: ${figure.caption}`);
        });
      }
      
      if (content.references.length > 0) {
        console.log('\n📚 參考文獻示例:');
        content.references.slice(0, 3).forEach((ref, index) => {
          console.log(`  [${index + 1}] ${ref.text.substring(0, 80)}...`);
        });
      }
      
    } else {
      console.error('❌ 文本提取失敗:', extractResult.error?.message);
    }
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🎉 PDF 解析測試完成！');
  console.log('📈 成果: 成功從 PDF 提取結構化文本內容');
}

// 運行測試
testPdfParsing().catch(console.error);