#!/usr/bin/env node

/**
 * 綜合測試所有三個引擎的 v2.0 深度功能
 * 驗證 ArxivEngine, WikipediaEngine, SemanticScholarEngine 都達到完美水準
 */

import { ArxivEngine } from './dist/engines/ArxivEngine.js';
import { WikipediaEngine } from './dist/engines/WikipediaEngine.js';
import { SemanticScholarEngine } from './dist/engines/SemanticScholarEngine.js';

async function testAllEnginesV2() {
  console.log('🧪 測試開始：三大引擎 v2.0 完整功能驗證');
  console.log('=' .repeat(80));
  console.log('🎯 目標：確認所有引擎都實現了深度內容獲取和分析');
  console.log('📊 對比標準：從表面摘要升級為完整深度分析\n');
  
  const results = {
    arxiv: { success: false, score: 0, details: {} },
    wikipedia: { success: false, score: 0, details: {} },
    scholar: { success: false, score: 0, details: {} }
  };

  // ========== 測試 1: ArxivEngine v2.0 ==========
  console.log('🔬 測試 1: ArxivEngine v2.0 PDF 深度解析');
  console.log('-'.repeat(60));
  
  try {
    const arxivEngine = new ArxivEngine();
    await arxivEngine.initialize();
    
    // 使用已知存在的論文 ID
    const arxivId = '2005.11401';
    console.log(`📄 測試論文: ${arxivId} (RAG 經典論文)`);
    
    const startTime = Date.now();
    const arxivResult = await arxivEngine.downloadPaper(arxivId);
    const arxivTime = Date.now() - startTime;
    
    if (arxivResult.success && arxivResult.metadata?.fullContent) {
      const content = arxivResult.metadata.fullContent;
      results.arxiv.success = true;
      results.arxiv.details = {
        title: content.metadata?.title || 'RAG Paper',
        authors: content.metadata?.author || 'Unknown',
        wordCount: content.wordCount || 0,
        processingTime: arxivTime,
        hasStructuredContent: !!(content.sections && content.sections.length > 0),
        hasFigures: !!(content.figures && content.figures.length > 0),
        hasReferences: !!(content.references && content.references.length > 0)
      };
      
      // 評分標準
      let score = 0;
      if (results.arxiv.details.wordCount > 5000) score += 30; // 內容豐富度
      if (results.arxiv.details.hasStructuredContent) score += 25; // 結構化解析
      if (results.arxiv.details.hasFigures) score += 15; // 圖表提取
      if (results.arxiv.details.hasReferences) score += 15; // 參考文獻
      if (arxivTime < 10000) score += 15; // 性能
      
      results.arxiv.score = score;
      
      console.log(`✅ ArxivEngine 測試完成 (評分: ${score}/100)`);
      console.log(`   📝 字數: ${results.arxiv.details.wordCount.toLocaleString()}`);
      console.log(`   ⏱️  時間: ${arxivTime}ms`);
      console.log(`   📊 結構: ${results.arxiv.details.hasStructuredContent ? '✅' : '❌'}`);
      console.log(`   🖼️  圖表: ${results.arxiv.details.hasFigures ? '✅' : '❌'}`);
      console.log(`   📚 參考: ${results.arxiv.details.hasReferences ? '✅' : '❌'}`);
    } else {
      console.log('❌ ArxivEngine 測試失敗:', arxivResult.error?.message);
    }
  } catch (error) {
    console.log('❌ ArxivEngine 測試異常:', error.message);
  }

  console.log('');

  // ========== 測試 2: WikipediaEngine v2.0 ==========
  console.log('🔬 測試 2: WikipediaEngine v2.0 HTML 深度解析');
  console.log('-'.repeat(60));
  
  try {
    const wikiEngine = new WikipediaEngine();
    await wikiEngine.initialize();
    
    const topic = '深度學習';
    console.log(`📄 測試主題: ${topic}`);
    
    const startTime = Date.now();
    const wikiResult = await wikiEngine.downloadFullPage(topic, 'zh');
    const wikiTime = Date.now() - startTime;
    
    if (wikiResult.success && wikiResult.data) {
      const content = wikiResult.data;
      results.wikipedia.success = true;
      results.wikipedia.details = {
        title: content.title,
        contentLength: content.fullContent.length,
        sectionsCount: content.sections.length,
        categoriesCount: content.categories.length,
        relatedTopicsCount: content.relatedTopics.length,
        processingTime: wikiTime,
        hasInfoBox: Object.keys(content.infobox).length > 0,
        hasStructuredContent: content.sections.length > 5
      };
      
      // 評分標準
      let score = 0;
      if (results.wikipedia.details.contentLength > 50000) score += 30; // 內容豐富度
      if (results.wikipedia.details.sectionsCount > 10) score += 25; // 章節結構
      if (results.wikipedia.details.hasInfoBox) score += 15; // InfoBox 提取
      if (results.wikipedia.details.categoriesCount > 3) score += 15; // 分類標籤
      if (wikiTime < 5000) score += 15; // 性能
      
      results.wikipedia.score = score;
      
      console.log(`✅ WikipediaEngine 測試完成 (評分: ${score}/100)`);
      console.log(`   📝 字數: ${results.wikipedia.details.contentLength.toLocaleString()}`);
      console.log(`   ⏱️  時間: ${wikiTime}ms`);
      console.log(`   📖 章節: ${results.wikipedia.details.sectionsCount}`);
      console.log(`   🏷️  分類: ${results.wikipedia.details.categoriesCount}`);
      console.log(`   📊 InfoBox: ${results.wikipedia.details.hasInfoBox ? '✅' : '❌'}`);
    } else {
      console.log('❌ WikipediaEngine 測試失敗:', wikiResult.error?.message);
    }
  } catch (error) {
    console.log('❌ WikipediaEngine 測試異常:', error.message);
  }

  console.log('');

  // ========== 測試 3: SemanticScholarEngine v2.0 ==========
  console.log('🔬 測試 3: SemanticScholarEngine v2.0 學術網絡深度分析');
  console.log('-'.repeat(60));
  
  try {
    const scholarEngine = new SemanticScholarEngine();
    await scholarEngine.initialize();
    
    const topic = 'natural language processing';
    console.log(`📄 測試主題: ${topic}`);
    
    const startTime = Date.now();
    const scholarResult = await scholarEngine.performDeepAnalysis(topic, {
      maxResults: 20,
      minCitationCount: 50
    });
    const scholarTime = Date.now() - startTime;
    
    if (scholarResult.success && scholarResult.data) {
      const analysis = scholarResult.data;
      results.scholar.success = true;
      results.scholar.details = {
        topPaper: analysis.title,
        papersAnalyzed: analysis.relatedPapers.length + 1,
        authorsAnalyzed: analysis.authorAnalysis.length,
        networkSize: analysis.citationNetwork.networkSize,
        processingTime: scholarTime,
        hasTrendAnalysis: !!(analysis.trendAnalysis && analysis.trendAnalysis.hotTopics.length > 0),
        hasComprehensiveSummary: analysis.contentSummary.length > 500
      };
      
      // 評分標準
      let score = 0;
      if (results.scholar.details.papersAnalyzed > 15) score += 30; // 論文數量
      if (results.scholar.details.authorsAnalyzed > 10) score += 25; // 學者分析
      if (results.scholar.details.hasTrendAnalysis) score += 20; // 趨勢分析
      if (results.scholar.details.hasComprehensiveSummary) score += 15; // 綜合摘要
      if (scholarTime < 30000) score += 10; // 性能（允許較長時間）
      
      results.scholar.score = score;
      
      console.log(`✅ SemanticScholarEngine 測試完成 (評分: ${score}/100)`);
      console.log(`   📄 論文: ${results.scholar.details.papersAnalyzed}`);
      console.log(`   👥 學者: ${results.scholar.details.authorsAnalyzed}`);
      console.log(`   ⏱️  時間: ${scholarTime}ms`);
      console.log(`   📈 趨勢: ${results.scholar.details.hasTrendAnalysis ? '✅' : '❌'}`);
      console.log(`   📝 摘要: ${results.scholar.details.hasComprehensiveSummary ? '✅' : '❌'}`);
    } else {
      console.log('❌ SemanticScholarEngine 測試失敗:', scholarResult.error?.message);
    }
  } catch (error) {
    console.log('❌ SemanticScholarEngine 測試異常:', error.message);
  }

  // ========== 綜合評估 ==========
  console.log('');
  console.log('📊 綜合評估結果');
  console.log('=' .repeat(80));
  
  const totalScore = results.arxiv.score + results.wikipedia.score + results.scholar.score;
  const maxScore = 300;
  const percentage = Math.round((totalScore / maxScore) * 100);
  
  console.log(`🏆 總體評分: ${totalScore}/${maxScore} (${percentage}%)`);
  console.log('');
  
  console.log('📈 各引擎表現:');
  console.log(`   🔬 ArxivEngine:     ${results.arxiv.score}/100 ${results.arxiv.success ? '✅' : '❌'}`);
  console.log(`   📚 WikipediaEngine: ${results.wikipedia.score}/100 ${results.wikipedia.success ? '✅' : '❌'}`);
  console.log(`   🎓 ScholarEngine:   ${results.scholar.score}/100 ${results.scholar.success ? '✅' : '❌'}`);
  console.log('');
  
  console.log('🎯 達成目標評估:');
  const perfectEngines = [results.arxiv, results.wikipedia, results.scholar].filter(r => r.score >= 70).length;
  console.log(`   ✅ 達到優秀水準的引擎: ${perfectEngines}/3`);
  console.log(`   📊 平均分數: ${Math.round(totalScore / 3)}/100`);
  
  if (percentage >= 80) {
    console.log('   🎉 評級: 優秀 - 所有引擎都實現了深度分析能力');
  } else if (percentage >= 60) {
    console.log('   ✅ 評級: 良好 - 大部分引擎達到預期目標');
  } else {
    console.log('   ⚠️  評級: 需改進 - 部分引擎仍需優化');
  }
  
  console.log('');
  console.log('🔍 對比分析 (vs 初版表面摘要):');
  console.log(`   📈 ArxivEngine: 141 字符 → ${results.arxiv.details.wordCount?.toLocaleString() || '0'} 字符 (${Math.round((results.arxiv.details.wordCount || 0) / 141)}x 提升)`);
  console.log(`   📈 WikipediaEngine: 表面摘要 → ${results.wikipedia.details?.contentLength?.toLocaleString() || '0'} 字符 + ${results.wikipedia.details?.sectionsCount || 0} 章節`);
  console.log(`   📈 ScholarEngine: 基礎搜索 → ${results.scholar.details?.papersAnalyzed || 0} 論文 + ${results.scholar.details?.authorsAnalyzed || 0} 學者網絡分析`);
  
  console.log('');
  console.log('=' .repeat(80));
  console.log('🎉 三大引擎 v2.0 完整功能驗證完成！');
  console.log(`📊 整體成果: ${percentage >= 70 ? '✅ 成功實現深度分析升級' : '⚠️ 需要進一步優化'}`);
}

// 運行測試
testAllEnginesV2().catch(console.error);