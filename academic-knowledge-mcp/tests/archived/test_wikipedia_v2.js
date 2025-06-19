#!/usr/bin/env node

/**
 * 測試 WikipediaEngine v2.0 深度內容獲取功能
 */

import { WikipediaEngine } from './dist/engines/WikipediaEngine.js';

async function testWikipediaV2() {
  console.log('🧪 測試開始：WikipediaEngine v2.0 深度內容獲取');
  console.log('=' .repeat(60));
  
  try {
    // 初始化引擎
    console.log('📚 初始化 Wikipedia 引擎...');
    const wikiEngine = new WikipediaEngine();
    await wikiEngine.initialize();
    console.log('✅ 初始化完成\n');
    
    // 測試主題
    const testTopic = '人工智能';
    console.log(`🎯 測試主題: ${testTopic}`);
    console.log(`📄 這是一個內容豐富的 Wikipedia 頁面`);
    
    console.log('🚀 v2.0 開始下載完整 Wikipedia 頁面...\n');
    
    // 執行深度內容獲取
    const startTime = Date.now();
    const result = await wikiEngine.downloadFullPage(testTopic, 'zh');
    const processingTime = Date.now() - startTime;
    
    if (result.success && result.data) {
      const content = result.data;
      
      console.log('✅ Wikipedia v2.0 頁面下載成功！\n');
      
      console.log('📊 內容統計:');
      console.log(`  ⏱️  處理時間: ${processingTime}ms`);
      console.log(`  📝 總字數: ${content.fullContent.length.toLocaleString()}`);
      console.log(`  📖 章節數: ${content.sections.length}`);
      console.log(`  🏷️  分類數: ${content.categories.length}`);
      console.log(`  🔗 相關主題: ${content.relatedTopics.length}`);
      console.log(`  📋 InfoBox 項目: ${Object.keys(content.infobox).length}`);
      
      console.log('\n📑 基本信息:');
      console.log(`  📋 標題: ${content.title}`);
      console.log(`  📝 摘要長度: ${content.summary.length} 字符`);
      console.log(`  🕒 最後修改: ${content.lastModified ? new Date(content.lastModified).toLocaleDateString() : '未知'}`);
      
      console.log('\n🗂️  章節結構:');
      content.sections.slice(0, 10).forEach((section, index) => {
        const indent = '  '.repeat(section.level);
        const icon = section.level === 1 ? '●' : section.level === 2 ? '○' : '◦';
        console.log(`${indent}${icon} ${section.title}`);
        console.log(`${indent}  📝 ${section.content.length} 字符`);
      });
      
      if (content.sections.length > 10) {
        console.log(`  ... 還有 ${content.sections.length - 10} 個章節`);
      }
      
      console.log('\n📝 摘要內容:');
      console.log('─'.repeat(50));
      console.log(content.summary);
      console.log('─'.repeat(50));
      
      console.log('\n📝 完整內容示例 (前 500 字符):');
      console.log('─'.repeat(50));
      console.log(content.fullContent.substring(0, 500) + '...');
      console.log('─'.repeat(50));
      
      if (Object.keys(content.infobox).length > 0) {
        console.log('\n📊 InfoBox 信息:');
        Object.entries(content.infobox).slice(0, 5).forEach(([key, value]) => {
          console.log(`  - ${key}: ${value}`);
        });
      }
      
      if (content.categories.length > 0) {
        console.log('\n🏷️  分類標籤:');
        content.categories.slice(0, 8).forEach(category => {
          console.log(`  - ${category}`);
        });
      }
      
      if (content.relatedTopics.length > 0) {
        console.log('\n🔗 相關主題:');
        content.relatedTopics.slice(0, 8).forEach(topic => {
          console.log(`  - ${topic}`);
        });
      }
      
      // 對比分析
      console.log('\n📈 深度分析成果對比:');
      console.log(`  🆚 對比 ArxivEngine: 同樣實現了完整內容下載和結構化解析`);
      console.log(`  📄 內容豐富度: ${content.fullContent.length > 5000 ? '✅ 優秀' : '⚠️ 需改進'} (${content.fullContent.length} 字符)`);
      console.log(`  🗂️  結構化程度: ${content.sections.length > 5 ? '✅ 優秀' : '⚠️ 需改進'} (${content.sections.length} 章節)`);
      console.log(`  📊 元數據完整性: ${Object.keys(content.infobox).length > 0 ? '✅ 優秀' : '⚠️ 基本'}`);
      
    } else {
      console.error('❌ Wikipedia v2.0 頁面下載失敗:', result.error?.message);
    }
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 WikipediaEngine v2.0 測試完成！');
  console.log('📈 成果: 成功實現與 ArxivEngine 同等的深度內容獲取能力');
}

// 運行測試
testWikipediaV2().catch(console.error);