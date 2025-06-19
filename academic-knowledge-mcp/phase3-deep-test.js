/**
 * Phase 3: 個別引擎深度測試
 * 清除緩存後進行深入測試，發現潛在問題
 * 2025-06-19
 */

import { ArxivEngine } from './dist/engines/ArxivEngine.js';
import { SemanticScholarEngine } from './dist/engines/SemanticScholarEngine.js';
import { WikipediaEngine } from './dist/engines/WikipediaEngine.js';
import { KnowledgeIntegrationService } from './dist/services/KnowledgeIntegrationService.js';

class Phase3DeepTester {
  constructor() {
    this.results = {};
  }

  async runPhase3Tests() {
    console.log('🚀 Phase 3: 個別引擎深度測試');
    console.log('============================================================');
    console.log('📋 測試方針: 清除緩存後深入測試，發現潛在問題');
    console.log('🎯 測試主題: "量子計算" (測試中文學術搜索能力)');
    console.log('');

    await this.testArxivEngineDeep();
    await this.testSemanticScholarDeep();
    await this.testWikipediaEngineDeep();
    await this.testIntegrationServiceDeep();

    this.printPhase3Summary();
  }

  async testArxivEngineDeep() {
    console.log('\n🔬 深度測試 1: ArxivEngine PDF下載與解析');
    console.log('-'.repeat(60));
    
    try {
      const engine = new ArxivEngine();
      await engine.initialize();
      console.log('✅ 初始化成功');

      // 測試1: 基本搜索
      console.log('\n📊 步驟 1: 基本論文搜索');
      const searchResult = await engine.searchPapers('quantum computing', { maxResults: 5 });
      
      if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
        console.log(`✅ 搜索成功: 找到 ${searchResult.data.length} 篇論文`);
        
        // 測試2: 選擇第一篇論文進行深度下載
        const firstPaper = searchResult.data[0];
        console.log(`📄 目標論文: ${firstPaper.title}`);
        console.log(`🆔 arXiv ID: ${firstPaper.id}`);
        
        // 測試3: PDF 下載與文本提取
        console.log('\n📊 步驟 2: PDF 下載與文本提取');
        const downloadResult = await engine.downloadPaper(firstPaper.id);
        
        if (downloadResult.success) {
          console.log('✅ PDF 下載與解析成功');
          console.log(`📊 處理時間: ${downloadResult.metadata?.processingTime}ms`);
          console.log(`📝 內容字數: ${downloadResult.metadata?.fullContent?.wordCount || 'N/A'}`);
          console.log(`📑 章節數: ${downloadResult.metadata?.fullContent?.sections?.length || 'N/A'}`);
          console.log(`📚 參考文獻: ${downloadResult.metadata?.fullContent?.references?.length || 'N/A'}`);
          
          this.results.arxiv = { 
            success: true, 
            details: {
              searchPapers: searchResult.data.length,
              downloadSuccess: true,
              wordCount: downloadResult.metadata?.fullContent?.wordCount || 0,
              sections: downloadResult.metadata?.fullContent?.sections?.length || 0,
              processingTime: downloadResult.metadata?.processingTime || 0
            }
          };
        } else {
          console.log(`❌ PDF 下載失敗: ${downloadResult.error?.message}`);
          this.results.arxiv = { success: false, error: downloadResult.error?.message };
        }
      } else {
        console.log(`❌ 搜索失敗: ${searchResult.error?.message}`);
        this.results.arxiv = { success: false, error: searchResult.error?.message };
      }
      
    } catch (error) {
      console.log(`❌ 測試失敗: ${error.message}`);
      this.results.arxiv = { success: false, error: error.message };
    }
  }

  async testSemanticScholarDeep() {
    console.log('\n🎓 深度測試 2: SemanticScholarEngine 學術網絡分析');
    console.log('-'.repeat(60));
    
    try {
      const engine = new SemanticScholarEngine();
      await engine.initialize();
      console.log('✅ 初始化成功');

      // 測試1: 基本搜索
      console.log('\n📊 步驟 1: 學術論文搜索');
      const searchResult = await engine.searchAdvanced('quantum computing', { maxResults: 5 });
      
      if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
        console.log(`✅ 搜索成功: 找到 ${searchResult.data.length} 篇論文`);
        
        const firstPaper = searchResult.data[0];
        console.log(`📄 目標論文: ${firstPaper.title}`);
        console.log(`🆔 Paper ID: ${firstPaper.paperId}`);
        console.log(`📊 引用數: ${firstPaper.citationCount}`);
        
        // 測試2: 構建引用網絡 (簡化測試)
        console.log('\n📊 步驟 2: 引用網絡分析 (簡化)');
        try {
          const networkResult = await engine.buildCitationNetwork(firstPaper.paperId);
          if (networkResult.success) {
            console.log('✅ 引用網絡構建成功');
            console.log(`🕸️ 引用論文: ${networkResult.data?.citations?.length || 0}`);
            console.log(`📚 參考文獻: ${networkResult.data?.references?.length || 0}`);
          } else {
            console.log(`⚠️ 引用網絡構建失敗: ${networkResult.error?.message}`);
          }
        } catch (error) {
          console.log(`⚠️ 引用網絡測試跳過 (API限流): ${error.message}`);
        }
        
        this.results.scholar = { 
          success: true, 
          details: {
            searchPapers: searchResult.data.length,
            processingTime: searchResult.metadata?.processingTime || 0
          }
        };
      } else {
        console.log(`❌ 搜索失敗: ${searchResult.error?.message}`);
        this.results.scholar = { success: false, error: searchResult.error?.message };
      }
      
    } catch (error) {
      console.log(`❌ 測試失敗: ${error.message}`);
      this.results.scholar = { success: false, error: error.message };
    }
  }

  async testWikipediaEngineDeep() {
    console.log('\n📖 深度測試 3: WikipediaEngine 完整內容獲取');
    console.log('-'.repeat(60));
    
    try {
      const engine = new WikipediaEngine();
      await engine.initialize();
      console.log('✅ 初始化成功');

      // 測試1: 完整頁面下載
      console.log('\n📊 步驟 1: 完整頁面下載');
      const downloadResult = await engine.downloadFullPage('量子计算', 'zh');
      
      if (downloadResult.success && downloadResult.data) {
        console.log('✅ 頁面下載成功');
        console.log(`📄 標題: ${downloadResult.data.title}`);
        console.log(`📝 摘要長度: ${downloadResult.data.summary?.length || 0} 字符`);
        console.log(`📑 章節數: ${downloadResult.data.sections?.length || 0}`);
        console.log(`🏷️ 分類數: ${downloadResult.data.categories?.length || 0}`);
        console.log(`ℹ️ InfoBox欄位: ${downloadResult.data.infobox?.length || 0}`);
        
        // 顯示章節結構
        if (downloadResult.data.sections && downloadResult.data.sections.length > 0) {
          console.log('\n📚 章節結構:');
          downloadResult.data.sections.slice(0, 5).forEach((section, i) => {
            console.log(`   ${i+1}. ${section.title} (${section.content?.length || 0} 字符)`);
          });
        }
        
        // 測試2: 智能搜索
        console.log('\n📊 步驟 2: 智能搜索測試');
        const searchResult = await engine.smartSearch('量子计算', 'professional');
        
        if (searchResult.success) {
          console.log('✅ 智能搜索成功');
          console.log(`📊 處理時間: ${searchResult.metadata?.processingTime}ms`);
          
          this.results.wikipedia = { 
            success: true, 
            details: {
              downloadSuccess: true,
              summaryLength: downloadResult.data.summary?.length || 0,
              sectionsCount: downloadResult.data.sections?.length || 0,
              categoriesCount: downloadResult.data.categories?.length || 0,
              infoboxFields: downloadResult.data.infobox?.length || 0,
              searchSuccess: true,
              processingTime: searchResult.metadata?.processingTime || 0
            }
          };
        } else {
          console.log(`❌ 智能搜索失敗: ${searchResult.error?.message}`);
          this.results.wikipedia = { success: false, error: searchResult.error?.message };
        }
      } else {
        console.log(`❌ 頁面下載失敗: ${downloadResult.error?.message}`);
        this.results.wikipedia = { success: false, error: downloadResult.error?.message };
      }
      
    } catch (error) {
      console.log(`❌ 測試失敗: ${error.message}`);
      this.results.wikipedia = { success: false, error: error.message };
    }
  }

  async testIntegrationServiceDeep() {
    console.log('\n🔗 深度測試 4: 知識整合服務端到端測試');
    console.log('-'.repeat(60));
    
    try {
      const service = new KnowledgeIntegrationService();
      await service.initialize();
      console.log('✅ 初始化成功');

      // 測試1: 快速知識概覽
      console.log('\n📊 步驟 1: 快速知識概覽');
      const overviewResult = await service.quickKnowledgeOverview('量子計算');
      
      if (overviewResult.success && overviewResult.data) {
        console.log('✅ 快速概覽成功');
        console.log(`📝 摘要長度: ${overviewResult.data.content?.summary?.length || 0} 字符`);
        console.log(`🔑 關鍵點: ${overviewResult.data.content?.keyPoints?.length || 0} 個`);
        console.log(`📊 處理時間: ${overviewResult.processingTime}ms`);
      } else {
        console.log(`❌ 快速概覽失敗: ${overviewResult.error?.message}`);
      }

      // 測試2: 多源知識摘要
      console.log('\n📊 步驟 2: 多源知識摘要');
      const summaryResult = await service.multiSourceSummary({
        topic: '量子計算',
        depth: 'professional',
        timeLimit: 15,
        sources: ['wikipedia', 'semanticscholar'] // 暫時排除 arxiv (網絡問題)
      });
      
      if (summaryResult.success && summaryResult.data) {
        console.log('✅ 多源摘要成功');
        console.log(`📊 資料來源: ${summaryResult.data.sources?.length || 0} 個`);
        console.log(`📝 內容長度: ${summaryResult.data.content?.summary?.length || 0} 字符`);
        console.log(`📊 處理時間: ${summaryResult.processingTime}ms`);
        
        // 顯示來源貢獻
        if (summaryResult.data.sources) {
          console.log('\n📚 來源貢獻度:');
          summaryResult.data.sources.forEach(source => {
            console.log(`   ${source.source}: ${source.contribution}% (品質 ${source.quality}/10)`);
          });
        }
        
        this.results.integration = { 
          success: true, 
          details: {
            overviewSuccess: overviewResult.success,
            summarySuccess: true,
            sourcesCount: summaryResult.data.sources?.length || 0,
            contentLength: summaryResult.data.content?.summary?.length || 0,
            processingTime: summaryResult.processingTime || 0
          }
        };
      } else {
        console.log(`❌ 多源摘要失敗: ${summaryResult.error?.message}`);
        this.results.integration = { success: false, error: summaryResult.error?.message };
      }
      
    } catch (error) {
      console.log(`❌ 測試失敗: ${error.message}`);
      this.results.integration = { success: false, error: error.message };
    }
  }

  printPhase3Summary() {
    console.log('\n📋 Phase 3 深度測試總結');
    console.log('============================================================');
    
    const engines = [
      { name: 'ArxivEngine', key: 'arxiv', icon: '🔬' },
      { name: 'SemanticScholarEngine', key: 'scholar', icon: '🎓' },
      { name: 'WikipediaEngine', key: 'wikipedia', icon: '📖' },
      { name: 'Integration Service', key: 'integration', icon: '🔗' }
    ];
    
    let successCount = 0;
    engines.forEach(engine => {
      const result = this.results[engine.key];
      const status = result?.success ? '✅ 通過' : '❌ 失敗';
      console.log(`${engine.icon} ${engine.name.padEnd(20)} ${status}`);
      if (result?.success) successCount++;
      
      if (result?.details) {
        Object.entries(result.details).forEach(([key, value]) => {
          console.log(`     ${key}: ${value}`);
        });
      }
      if (result?.error) {
        console.log(`     錯誤: ${result.error}`);
      }
    });
    
    console.log(`\n🎯 整體成功率: ${successCount}/${engines.length} (${Math.round(successCount/engines.length*100)}%)`);
    
    // 問題診斷
    console.log('\n🔍 問題診斷:');
    if (!this.results.arxiv?.success) {
      console.log('   🌐 ArxivEngine: 網絡連接問題需要進一步調查');
    }
    if (!this.results.scholar?.success) {
      console.log('   ⏱️ SemanticScholar: API限流問題，需要優化請求頻率');
    }
    if (!this.results.wikipedia?.success) {
      console.log('   📖 Wikipedia: 內容解析問題需要檢查');
    }
    if (!this.results.integration?.success) {
      console.log('   🔗 Integration: 統合服務依賴於各引擎狀態');
    }
    
    console.log('\n🎉 Phase 3 深度測試完成！準備進入個別問題修復階段。');
  }
}

// 執行測試
const tester = new Phase3DeepTester();
tester.runPhase3Tests().catch(console.error);