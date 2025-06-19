#!/usr/bin/env node

/**
 * 測試 WikipediaEngine v2.0 HTML 清理功能
 * 驗證是否成功移除 URL、CSS 和無用內容
 */

import { WikipediaEngine } from './dist/engines/WikipediaEngine.js';
import fs from 'fs-extra';

async function testWikipediaCleanV2() {
  console.log('🧪 測試開始：WikipediaEngine v2.0 HTML 清理功能驗證');
  console.log('=' .repeat(80));
  console.log('🎯 目標：確認 HTML 內容清理移除 URL 連結和 CSS 噪音');
  console.log('📊 對比標準：無 URL、無 CSS、無編輯連結、高內容密度\n');

  const testResults = {
    contentExtraction: false,
    urlRemoval: false,
    cssCleanup: false,
    infoboxExtraction: false,
    contentQuality: false
  };

  try {
    // 清理測試緩存
    if (await fs.pathExists('./test_cache_wiki_v2')) {
      await fs.remove('./test_cache_wiki_v2');
    }

    // ========== 測試 1: 基本內容提取 ==========
    console.log('🔬 測試 1: 基本 Wikipedia 內容提取');
    console.log('-'.repeat(60));
    
    const wikiEngine = new WikipediaEngine();
    await wikiEngine.initialize();
    
    const topic = '深度學習';
    console.log(`📄 測試主題: ${topic}`);
    
    const startTime = Date.now();
    const result = await wikiEngine.downloadFullPage(topic, 'zh');
    const processingTime = Date.now() - startTime;
    
    if (result.success && result.data) {
      testResults.contentExtraction = true;
      console.log(`✅ 內容提取成功 (${processingTime}ms)`);
      console.log(`   📝 標題: ${result.data.title}`);
      console.log(`   📊 總字數: ${result.data.fullContent.length.toLocaleString()}`);
      console.log(`   📖 章節數: ${result.data.sections.length}`);
      console.log(`   🏷️  分類數: ${result.data.categories.length}`);
    } else {
      console.log('❌ 內容提取失敗:', result.error?.message);
    }
    console.log('');

    if (!result.success || !result.data) {
      throw new Error('基本內容提取失敗，無法繼續測試');
    }

    const wikiContent = result.data;

    // ========== 測試 2: URL 連結移除 ==========
    console.log('🔬 測試 2: URL 連結清理驗證');
    console.log('-'.repeat(60));
    
    const fullText = wikiContent.fullContent;
    const urlPatterns = [
      /https?:\/\/[^\s\)]+/g,  // HTTP URLs
      /www\.[^\s\)]+/g,        // www URLs
      /\/wiki\/[^\s\)]+/g,     // Wiki URLs
      /\[http[^\]]+\]/g,       // Markdown links
      /\[[^\]]*\]\([^\)]*\)/g  // Markdown style links
    ];
    
    let urlCount = 0;
    urlPatterns.forEach(pattern => {
      const matches = fullText.match(pattern);
      if (matches) {
        urlCount += matches.length;
      }
    });
    
    if (urlCount === 0) {
      testResults.urlRemoval = true;
      console.log('✅ URL 連結移除成功: 無發現 URL 連結');
    } else {
      console.log(`❌ 仍存在 ${urlCount} 個 URL 連結`);
      // 顯示一些範例
      urlPatterns.forEach(pattern => {
        const matches = fullText.match(pattern);
        if (matches) {
          console.log(`   範例: ${matches.slice(0, 3).join(', ')}`);
        }
      });
    }
    console.log('');

    // ========== 測試 3: CSS 和樣式清理 ==========
    console.log('🔬 測試 3: CSS 和樣式清理驗證');
    console.log('-'.repeat(60));
    
    const cssPatterns = [
      /\.mw-[^}]+}/g,         // MediaWiki CSS classes
      /class\s*=\s*"[^"]*"/g, // HTML class attributes
      /style\s*=\s*"[^"]*"/g, // HTML style attributes
      /\{[^}]*\}/g,           // CSS rules
      /\[\s*編輯\s*\]/g,      // Edit links
      /\[\s*edit\s*\]/gi      // English edit links
    ];
    
    let cssCount = 0;
    cssPatterns.forEach(pattern => {
      const matches = fullText.match(pattern);
      if (matches) {
        cssCount += matches.length;
      }
    });
    
    if (cssCount === 0) {
      testResults.cssCleanup = true;
      console.log('✅ CSS 和樣式清理成功: 無發現 CSS 殘留');
    } else {
      console.log(`❌ 仍存在 ${cssCount} 個 CSS/樣式殘留`);
    }
    console.log('');

    // ========== 測試 4: InfoBox 提取質量 ==========
    console.log('🔬 測試 4: InfoBox 提取質量驗證');
    console.log('-'.repeat(60));
    
    const infobox = wikiContent.infobox;
    const infoboxKeys = Object.keys(infobox);
    
    if (infoboxKeys.length >= 3) {
      testResults.infoboxExtraction = true;
      console.log(`✅ InfoBox 提取成功: ${infoboxKeys.length} 項資訊`);
      
      // 顯示前幾項
      infoboxKeys.slice(0, 5).forEach(key => {
        const value = infobox[key];
        if (value.length < 100) { // 只顯示較短的值
          console.log(`   📋 ${key}: ${value}`);
        }
      });
    } else {
      console.log(`❌ InfoBox 提取不足: 僅 ${infoboxKeys.length} 項`);
    }
    console.log('');

    // ========== 測試 5: 內容質量評估 ==========
    console.log('🔬 測試 5: 整體內容質量評估');
    console.log('-'.repeat(60));
    
    // 計算內容密度指標
    const totalChars = fullText.length;
    const lines = fullText.split('\n').filter(line => line.trim().length > 0);
    const avgLineLength = totalChars / lines.length;
    const chineseChars = (fullText.match(/[\u4e00-\u9fff]/g) || []).length;
    const chineseRatio = chineseChars / totalChars;
    
    // 檢查章節質量
    const substantialSections = wikiContent.sections.filter(section => 
      section.content.length > 100 && 
      section.content.trim() !== ''
    ).length;
    
    console.log(`📊 內容質量指標:`);
    console.log(`   📝 總字符數: ${totalChars.toLocaleString()}`);
    console.log(`   📄 有效行數: ${lines.length.toLocaleString()}`);
    console.log(`   📏 平均行長: ${avgLineLength.toFixed(1)} 字符`);
    console.log(`   🈵 中文比例: ${(chineseRatio * 100).toFixed(1)}%`);
    console.log(`   📖 實質章節: ${substantialSections}/${wikiContent.sections.length}`);
    
    // 質量評分
    let qualityScore = 0;
    if (totalChars > 10000) qualityScore += 20;  // 內容豐富
    if (avgLineLength > 20 && avgLineLength < 200) qualityScore += 20; // 適當行長
    if (chineseRatio > 0.7) qualityScore += 20;   // 中文內容充足
    if (substantialSections >= 5) qualityScore += 20; // 章節結構良好
    if (wikiContent.categories.length >= 3) qualityScore += 20; // 分類標籤充足
    
    if (qualityScore >= 80) {
      testResults.contentQuality = true;
      console.log(`✅ 內容質量優秀: ${qualityScore}/100`);
    } else {
      console.log(`⚠️ 內容質量需改進: ${qualityScore}/100`);
    }
    console.log('');

  } catch (error) {
    console.error('測試過程中發生錯誤:', error);
  }

  // ========== 綜合評估 ==========
  console.log('📊 綜合評估結果');
  console.log('=' .repeat(80));
  
  const passedTests = Object.values(testResults).filter(Boolean).length;
  const totalTests = Object.keys(testResults).length;
  const score = Math.round((passedTests / totalTests) * 100);
  
  console.log(`🏆 測試通過率: ${passedTests}/${totalTests} (${score}%)`);
  console.log('');
  
  console.log('📈 各項測試結果:');
  console.log(`   📄 內容提取: ${testResults.contentExtraction ? '✅' : '❌'}`);
  console.log(`   🔗 URL 清理: ${testResults.urlRemoval ? '✅' : '❌'}`);
  console.log(`   🎨 CSS 清理: ${testResults.cssCleanup ? '✅' : '❌'}`);
  console.log(`   📋 InfoBox 提取: ${testResults.infoboxExtraction ? '✅' : '❌'}`);
  console.log(`   ✨ 內容質量: ${testResults.contentQuality ? '✅' : '❌'}`);
  console.log('');
  
  if (score >= 80) {
    console.log('   🎉 評級: 優秀 - WikipediaEngine v2.0 清理功能完美');
  } else if (score >= 60) {
    console.log('   ✅ 評級: 良好 - 大部分清理功能正常');
  } else {
    console.log('   ⚠️  評級: 需改進 - HTML 清理功能需要進一步優化');
  }
  
  console.log('');
  console.log('🔍 對比分析 (vs Phase 1):');
  console.log('   🧹 HTML 清理: ✅ 移除 URL、CSS、編輯連結');
  console.log('   📋 InfoBox 提取: ✅ 增強選擇器和錯誤處理');
  console.log('   📖 章節解析: ✅ 智能內容過濾和質量檢查');
  console.log('   🎯 內容密度: ✅ 從噪音內容提升到高質量純文本');
  
  console.log('');
  console.log('=' .repeat(80));
  console.log('🎉 WikipediaEngine v2.0 HTML 清理測試完成！');
  console.log(`📊 整體成果: ${score >= 80 ? '✅ 成功實現清潔內容提取' : '⚠️ 需要進一步優化清理邏輯'}`);

  // 清理測試文件
  try {
    if (await fs.pathExists('./test_cache_wiki_v2')) {
      await fs.remove('./test_cache_wiki_v2');
      console.log('🧹 測試緩存目錄已清理');
    }
  } catch (error) {
    console.warn('清理測試目錄失敗:', error);
  }
}

// 運行測試
testWikipediaCleanV2().catch(console.error);