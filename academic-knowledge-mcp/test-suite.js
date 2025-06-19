#!/usr/bin/env node

/**
 * 統一測試套件 - Academic Knowledge MCP v2.5
 * 單一固定的測試文件，避免混亂
 */

import { ArxivEngine } from './dist/engines/ArxivEngine.js';
import { WikipediaEngine } from './dist/engines/WikipediaEngine.js';
import { SemanticScholarEngine } from './dist/engines/SemanticScholarEngine.js';
import { KnowledgeIntegrationService } from './dist/services/KnowledgeIntegrationService.js';

const TEST_TOPICS = {
  chinese: '深度學習',
  english: 'deep learning'
};

class UnifiedTestSuite {
  constructor() {
    this.results = {
      arxiv: null,
      wikipedia: null,
      scholar: null,
      integration: null
    };
  }

  async runAllTests() {
    console.log('🧪 Academic Knowledge MCP v2.5 統一測試套件');
    console.log('='.repeat(60));
    
    await this.testWikipediaEngine();
    await this.testArxivEngine();
    await this.testScholarEngine();
    await this.testIntegrationService();
    
    this.printSummary();
  }

  async testWikipediaEngine() {
    console.log('\n📖 測試 1: WikipediaEngine v2.0');
    console.log('-'.repeat(40));
    
    try {
      const engine = new WikipediaEngine();
      await engine.initialize();
      console.log('✅ 初始化成功');
      
      const result = await engine.smartSearch(TEST_TOPICS.chinese, 'basic');
      
      this.results.wikipedia = {
        success: result.success,
        title: result.data?.title || '',
        summaryLength: result.data?.summary?.length || 0,
        sectionsCount: result.data?.sections?.length || 0,
        categoriesCount: result.data?.categories?.length || 0,
        infoboxFields: Object.keys(result.data?.infobox || {}).length
      };
      
      console.log(`📊 結果: ${result.success ? '成功' : '失敗'}`);
      if (result.success && result.data) {
        console.log(`   標題: ${result.data.title}`);
        console.log(`   摘要: ${result.data.summary?.length || 0} 字符`);
        console.log(`   章節: ${result.data.sections?.length || 0} 個`);
        console.log(`   分類: ${result.data.categories?.length || 0} 個`);
        console.log(`   InfoBox: ${Object.keys(result.data.infobox || {}).length} 欄位`);
        
        // 顯示實際內容片段
        if (result.data.summary && result.data.summary.length > 0) {
          console.log(`   摘要預覽: "${result.data.summary.substring(0, 100)}..."`);
        }
        
        if (result.data.sections && result.data.sections.length > 0) {
          console.log('   章節列表:');
          result.data.sections.slice(0, 3).forEach((section, i) => {
            console.log(`     ${i+1}. ${section.title} (${section.content?.length || 0} 字符)`);
          });
        }
      } else {
        console.log(`   錯誤: ${result.error?.message || '未知錯誤'}`);
      }
      
    } catch (error) {
      console.log(`❌ 測試失敗: ${error.message}`);
      this.results.wikipedia = { success: false, error: error.message };
    }
  }

  async testArxivEngine() {
    console.log('\n🔬 測試 2: ArxivEngine v2.0');
    console.log('-'.repeat(40));
    
    try {
      const engine = new ArxivEngine();
      await engine.initialize();
      console.log('✅ 初始化成功');
      
      const result = await engine.searchPapers(TEST_TOPICS.english, { maxResults: 3 });
      
      this.results.arxiv = {
        success: result.success,
        paperCount: result.data?.length || 0,
        processingTime: result.metadata?.processingTime || 0
      };
      
      console.log(`📊 結果: ${result.success ? '成功' : '失敗'}`);
      if (result.success && result.data) {
        console.log(`   論文數量: ${result.data.length}`);
        console.log(`   處理時間: ${result.metadata?.processingTime || 0}ms`);
        
        if (result.data.length > 0) {
          console.log('   前2篇論文:');
          result.data.slice(0, 2).forEach((paper, i) => {
            console.log(`     ${i+1}. "${paper.title}"`);
            console.log(`        年份: ${paper.publishedDate?.getFullYear() || 'N/A'}`);
            console.log(`        作者: ${paper.authors?.slice(0, 2).join(', ') || 'N/A'}`);
          });
        }
      } else {
        console.log(`   錯誤: ${result.error?.message || '未知錯誤'}`);
      }
      
    } catch (error) {
      console.log(`❌ 測試失敗: ${error.message}`);
      this.results.arxiv = { success: false, error: error.message };
    }
  }

  async testScholarEngine() {
    console.log('\n🎓 測試 3: SemanticScholarEngine v2.0');
    console.log('-'.repeat(40));
    
    try {
      const engine = new SemanticScholarEngine();
      await engine.initialize();
      console.log('✅ 初始化成功');
      
      // 使用正確的方法測試
      const result = await engine.performDeepAnalysis(TEST_TOPICS.english, { maxResults: 3 });
      
      this.results.scholar = {
        success: result.success,
        processingTime: result.metadata?.processingTime || 0
      };
      
      console.log(`📊 結果: ${result.success ? '成功' : '失敗'}`);
      if (result.success && result.data) {
        console.log(`   處理時間: ${result.metadata?.processingTime || 0}ms`);
        console.log(`   分析摘要: ${typeof result.data === 'string' ? result.data.substring(0, 200) : JSON.stringify(result.data).substring(0, 200)}...`);
      } else {
        console.log(`   錯誤: ${result.error?.message || '未知錯誤'}`);
      }
      
    } catch (error) {
      console.log(`❌ 測試失敗: ${error.message}`);
      this.results.scholar = { success: false, error: error.message };
    }
  }

  async testIntegrationService() {
    console.log('\n🔗 測試 4: KnowledgeIntegrationService');
    console.log('-'.repeat(40));
    
    try {
      const service = new KnowledgeIntegrationService();
      await service.initialize();
      console.log('✅ 初始化成功');
      
      const result = await service.multiSourceSummary({
        topic: TEST_TOPICS.chinese,
        depth: 'basic',
        timeLimit: 10,
        languages: ['zh', 'en'],
        format: 'summary'
      });
      
      this.results.integration = {
        success: result.success,
        processingTime: result.data?.processingTime || 0,
        sourcesCount: result.data?.sources?.length || 0
      };
      
      console.log(`📊 結果: ${result.success ? '成功' : '失敗'}`);
      if (result.success && result.data) {
        console.log(`   處理時間: ${result.data.processingTime || 0}ms`);
        console.log(`   資料來源: ${result.data.sources?.length || 0} 個`);
        console.log(`   主題: ${result.data.topic}`);
        console.log(`   內容長度: ${result.data.content?.summary?.length || 0} 字符`);
        
        if (result.data.sources) {
          console.log('   來源列表:');
          result.data.sources.forEach(source => {
            console.log(`     - ${source.source}: ${source.contribution}% 貢獻度, 品質 ${source.quality}/10`);
          });
        }
      } else {
        console.log(`   錯誤: ${result.error?.message || '未知錯誤'}`);
      }
      
    } catch (error) {
      console.log(`❌ 測試失敗: ${error.message}`);
      this.results.integration = { success: false, error: error.message };
    }
  }

  printSummary() {
    console.log('\n📋 測試總結');
    console.log('='.repeat(60));
    
    const engines = [
      { name: 'WikipediaEngine', result: this.results.wikipedia },
      { name: 'ArxivEngine', result: this.results.arxiv },
      { name: 'ScholarEngine', result: this.results.scholar },
      { name: 'IntegrationService', result: this.results.integration }
    ];
    
    let successCount = 0;
    engines.forEach(engine => {
      const status = engine.result?.success ? '✅ 通過' : '❌ 失敗';
      console.log(`${engine.name.padEnd(20)} ${status}`);
      if (engine.result?.success) successCount++;
    });
    
    console.log(`\n🎯 整體成功率: ${successCount}/${engines.length} (${Math.round(successCount/engines.length*100)}%)`);
    
    // 特別檢查 Wikipedia 的關鍵指標
    if (this.results.wikipedia?.success) {
      const wp = this.results.wikipedia;
      const score = this.calculateWikipediaScore(wp);
      console.log(`\n📊 Wikipedia 詳細評分: ${score}/100`);
      console.log(`   摘要: ${wp.summaryLength > 0 ? '✅' : '❌'} (${wp.summaryLength} 字符)`);
      console.log(`   章節: ${wp.sectionsCount > 0 ? '✅' : '❌'} (${wp.sectionsCount} 個)`);
      console.log(`   分類: ${wp.categoriesCount > 0 ? '✅' : '❌'} (${wp.categoriesCount} 個)`);
      console.log(`   InfoBox: ${wp.infoboxFields > 0 ? '✅' : '❌'} (${wp.infoboxFields} 欄位)`);
    }
    
    // 建議下一步行動
    console.log('\n💡 建議行動:');
    if (!this.results.wikipedia?.success || this.results.wikipedia?.summaryLength === 0) {
      console.log('   🔧 優先修復 WikipediaEngine 內容解析問題');
    }
    if (!this.results.arxiv?.success) {
      console.log('   🌐 檢查 ArxivEngine 網絡連接和 API 狀態');
    }
    if (!this.results.scholar?.success) {
      console.log('   🛠️ 修復 SemanticScholarEngine 數據處理邏輯');
    }
    if (!this.results.integration?.success) {
      console.log('   🔗 檢查 KnowledgeIntegrationService 整合邏輯');
    }
  }

  calculateWikipediaScore(wp) {
    let score = 0;
    if (wp.summaryLength > 100) score += 40;
    if (wp.sectionsCount > 0) score += 30;
    if (wp.categoriesCount > 0) score += 20;
    if (wp.infoboxFields > 0) score += 10;
    return score;
  }
}

// 執行測試
const testSuite = new UnifiedTestSuite();
testSuite.runAllTests().catch(console.error);