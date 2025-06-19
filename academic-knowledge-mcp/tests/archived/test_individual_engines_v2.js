#!/usr/bin/env node

import { ArxivEngine } from './dist/engines/ArxivEngine.js';
import { WikipediaEngine } from './dist/engines/WikipediaEngine.js';
import { SemanticScholarEngine } from './dist/engines/SemanticScholarEngine.js';

async function testIndividualEngines() {
  console.log('🧪 深度測試三大引擎 v2.0');
  
  const testTopic = '深度學習';
  const englishTopic = 'deep learning';
  
  console.log(`\n📌 測試主題: "${testTopic}" / "${englishTopic}"`);
  
  // 測試 1: ArxivEngine v2.0
  console.log('\n🔬 測試 1: ArxivEngine v2.0');
  console.log('===============================');
  try {
    const arxivEngine = new ArxivEngine();
    await arxivEngine.initialize();
    console.log('✅ ArxivEngine 初始化成功');
    
    const arxivResult = await arxivEngine.searchPapers(englishTopic, { maxResults: 3 });
    console.log('📊 搜索結果:');
    console.log('  成功:', arxivResult.success);
    
    if (arxivResult.success && arxivResult.data) {
      console.log('  論文數量:', arxivResult.data.length);
      arxivResult.data.slice(0, 2).forEach((paper, i) => {
        console.log(`  論文 ${i+1}: "${paper.title}"`);
        console.log(`    作者: ${paper.authors.join(', ')}`);
        console.log(`    摘要: ${paper.abstract.substring(0, 100)}...`);
      });
    } else {
      console.log('  錯誤:', arxivResult.error);
    }
  } catch (error) {
    console.log('❌ ArxivEngine 測試失敗:', error.message);
  }
  
  // 測試 2: WikipediaEngine v2.0
  console.log('\n🔬 測試 2: WikipediaEngine v2.0');
  console.log('===================================');
  try {
    const wikiEngine = new WikipediaEngine();
    await wikiEngine.initialize();
    console.log('✅ WikipediaEngine 初始化成功');
    
    const wikiResult = await wikiEngine.smartSearch(testTopic, 'basic');
    console.log('📊 搜索結果:');
    console.log('  成功:', wikiResult.success);
    
    if (wikiResult.success && wikiResult.data) {
      console.log('  標題:', wikiResult.data.title);
      console.log('  摘要長度:', wikiResult.data.summary.length);
      console.log('  章節數量:', wikiResult.data.sections.length);
      console.log('  分類數量:', wikiResult.data.categories.length);
      console.log('  摘要前200字:', wikiResult.data.summary.substring(0, 200));
      
      if (wikiResult.data.sections.length > 0) {
        console.log('  前3個章節:');
        wikiResult.data.sections.slice(0, 3).forEach((section, i) => {
          console.log(`    ${i+1}. ${section.title} (${section.content.length} 字符)`);
        });
      }
    } else {
      console.log('  錯誤:', wikiResult.error);
    }
  } catch (error) {
    console.log('❌ WikipediaEngine 測試失敗:', error.message);
  }
  
  // 測試 3: SemanticScholarEngine v2.0
  console.log('\n🔬 測試 3: SemanticScholarEngine v2.0');
  console.log('========================================');
  try {
    const scholarEngine = new SemanticScholarEngine();
    await scholarEngine.initialize();
    console.log('✅ SemanticScholarEngine 初始化成功');
    
    const scholarResult = await scholarEngine.searchAdvanced(englishTopic, { maxResults: 3 });
    console.log('📊 搜索結果:');
    console.log('  成功:', scholarResult.success);
    
    if (scholarResult.success && scholarResult.data) {
      console.log('  論文數量:', scholarResult.data.papers.length);
      console.log('  學者數量:', scholarResult.data.scholars.length);
      
      if (scholarResult.data.papers.length > 0) {
        console.log('  前2篇論文:');
        scholarResult.data.papers.slice(0, 2).forEach((paper, i) => {
          console.log(`    ${i+1}. "${paper.title}"`);
          console.log(`       年份: ${paper.year}, 引用: ${paper.citationCount}`);
          console.log(`       摘要: ${paper.abstract ? paper.abstract.substring(0, 100) : 'N/A'}...`);
        });
      }
      
      if (scholarResult.data.scholars.length > 0) {
        console.log('  頂級學者:');
        scholarResult.data.scholars.slice(0, 2).forEach((scholar, i) => {
          console.log(`    ${i+1}. ${scholar.name} (h-index: ${scholar.hIndex}, 論文: ${scholar.paperCount})`);
        });
      }
    } else {
      console.log('  錯誤:', scholarResult.error);
    }
  } catch (error) {
    console.log('❌ SemanticScholarEngine 測試失敗:', error.message);
  }
  
  console.log('\n🎯 測試總結');
  console.log('============');
  console.log('如果所有引擎都正常工作且返回與主題相關的內容，');
  console.log('那麼問題可能在於 KnowledgeIntegrationService 的調用邏輯。');
}

testIndividualEngines().catch(console.error);