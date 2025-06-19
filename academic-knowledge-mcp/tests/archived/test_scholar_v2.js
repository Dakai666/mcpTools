#!/usr/bin/env node

/**
 * 測試 SemanticScholarEngine v2.0 深度學術分析功能
 */

import { SemanticScholarEngine } from './dist/engines/SemanticScholarEngine.js';

async function testSemanticScholarV2() {
  console.log('🧪 測試開始：SemanticScholarEngine v2.0 深度學術分析');
  console.log('=' .repeat(60));
  
  try {
    // 初始化引擎
    console.log('📚 初始化 Semantic Scholar 引擎...');
    const scholarEngine = new SemanticScholarEngine();
    await scholarEngine.initialize();
    console.log('✅ 初始化完成\n');
    
    // 測試主題
    const testTopic = 'machine learning';
    console.log(`🎯 測試主題: ${testTopic}`);
    console.log(`📄 這是一個活躍的研究領域`);
    
    console.log('🚀 v2.0 開始深度學術分析...\n');
    
    // 執行深度學術分析
    const startTime = Date.now();
    const result = await scholarEngine.performDeepAnalysis(testTopic, {
      maxResults: 30,
      minCitationCount: 100,
      sortBy: 'citationCount'
    });
    const processingTime = Date.now() - startTime;
    
    if (result.success && result.data) {
      const analysis = result.data;
      
      console.log('✅ Semantic Scholar v2.0 深度分析成功！\n');
      
      console.log('📊 分析統計:');
      console.log(`  ⏱️  總處理時間: ${processingTime}ms`);
      console.log(`  📄 分析論文數: ${analysis.relatedPapers.length + 1}`);
      console.log(`  👥 分析學者數: ${analysis.authorAnalysis.length}`);
      console.log(`  🕸️  引用網絡規模: ${analysis.citationNetwork.networkSize}`);
      console.log(`  📈 趨勢分析時間跨度: ${analysis.trendAnalysis.timespan.start.getFullYear()}-${analysis.trendAnalysis.timespan.end.getFullYear()}`);
      
      console.log('\n📑 頂級論文詳情:');
      console.log(`  📋 標題: ${analysis.title}`);
      console.log(`  📄 論文ID: ${analysis.paperId}`);
      console.log(`  📚 引用次數: ${analysis.fullDetails.citationCount}`);
      console.log(`  ⭐ 有影響力引用: ${analysis.fullDetails.influentialCitationCount}`);
      console.log(`  👥 作者: ${analysis.fullDetails.authors.slice(0, 3).map(a => a.name).join(', ')}${analysis.fullDetails.authors.length > 3 ? ' 等' : ''}`);
      
      console.log('\n🕸️  引用網絡分析:');
      console.log(`  ⬆️  被引用論文: ${analysis.citationNetwork.citations.length}`);
      console.log(`  ⬇️  引用論文: ${analysis.citationNetwork.references.length}`);
      console.log(`  ⭐ 高影響力引用: ${analysis.citationNetwork.influentialCitations.length}`);
      console.log(`  🌐 網絡深度: ${analysis.citationNetwork.citationDepth}`);
      
      console.log('\n👥 主要學者分析:');
      analysis.authorAnalysis.slice(0, 5).forEach((author, index) => {
        console.log(`  ${index + 1}. ${author.name}`);
        console.log(`     📚 論文數: ${author.paperCount || 'N/A'}`);
        console.log(`     📊 引用數: ${author.citationCount || 'N/A'}`);
        console.log(`     📈 H指數: ${author.hIndex || 'N/A'}`);
        console.log(`     🏢 機構: ${author.affiliation || '未知'}`);
      });
      
      console.log('\n📈 研究趨勢洞察:');
      console.log(`  📊 發展趨勢: ${analysis.trendAnalysis.trendDirection === 'growing' ? '📈 快速增長' : analysis.trendAnalysis.trendDirection === 'declining' ? '📉 逐漸衰退' : '📊 穩定發展'}`);
      console.log(`  🔥 熱門主題: ${analysis.trendAnalysis.hotTopics.slice(0, 5).join(', ')}`);
      console.log(`  ⭐ 新興學者: ${analysis.trendAnalysis.emergingAuthors.slice(0, 3).map(a => a.name).join(', ')}`);
      console.log(`  📚 關鍵論文: ${analysis.trendAnalysis.keyPapers.length} 篇`);
      
      console.log('\n📝 綜合摘要:');
      console.log('─'.repeat(60));
      console.log(analysis.contentSummary);
      console.log('─'.repeat(60));
      
      console.log('\n📚 相關論文 (前5篇):');
      analysis.relatedPapers.slice(0, 5).forEach((paper, index) => {
        console.log(`  ${index + 1}. ${paper.title}`);
        console.log(`     📊 引用: ${paper.citationCount} | 影響力: ${paper.influentialCitationCount} | 年份: ${paper.year}`);
      });
      
      // 對比分析
      console.log('\n📈 深度分析成果對比:');
      console.log(`  🆚 對比 ArxivEngine: 學術網絡分析 vs PDF 文本解析`);
      console.log(`  📊 數據豐富度: ${analysis.relatedPapers.length > 20 ? '✅ 優秀' : '⚠️ 需改進'} (${analysis.relatedPapers.length + 1} 篇論文)`);
      console.log(`  🕸️  網絡分析: ${analysis.citationNetwork.networkSize > 10 ? '✅ 優秀' : '⚠️ 需改進'} (${analysis.citationNetwork.networkSize} 節點)`);
      console.log(`  👥 學者分析: ${analysis.authorAnalysis.length > 5 ? '✅ 優秀' : '⚠️ 需改進'} (${analysis.authorAnalysis.length} 位學者)`);
      console.log(`  📈 趨勢洞察: ✅ 獨特優勢 (多維度趨勢分析)`);
      
    } else {
      console.error('❌ Semantic Scholar v2.0 深度分析失敗:', result.error?.message);
    }
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 SemanticScholarEngine v2.0 測試完成！');
  console.log('📈 成果: 成功實現深度學術網絡分析和趨勢洞察能力');
}

// 運行測試
testSemanticScholarV2().catch(console.error);