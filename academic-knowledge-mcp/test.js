#!/usr/bin/env node

/**
 * Academic Knowledge Integration MCP Server 測試腳本
 */

import { KnowledgeIntegrationService } from './dist/services/KnowledgeIntegrationService.js';

async function runTests() {
  console.log('🧪 Academic Knowledge Integration MCP Server 測試開始');
  console.log('=' .repeat(60));
  
  const service = new KnowledgeIntegrationService();
  
  try {
    // 初始化服務
    console.log('⚙️ 初始化知識整合服務...');
    await service.initialize();
    console.log('✅ 服務初始化成功!\n');
    
    // 測試 1: 快速概覽
    console.log('📝 測試 1: 快速知識概覽');
    console.log('-'.repeat(40));
    const overviewResult = await service.quickKnowledgeOverview('人工智能');
    
    if (overviewResult.success && overviewResult.data) {
      console.log(`✅ 主題: ${overviewResult.data.topic}`);
      console.log(`📊 處理時間: ${overviewResult.data.processingTime}ms`);
      console.log(`🎯 信心度: ${overviewResult.data.metadata.confidence}%`);
      console.log(`📚 來源數量: ${overviewResult.data.sources.length}`);
      console.log(`📖 摘要長度: ${overviewResult.data.content.summary.length} 字符`);
      console.log(`🔑 關鍵點數量: ${overviewResult.data.content.keyPoints.length}`);
    } else {
      console.log(`❌ 快速概覽測試失敗: ${overviewResult.error?.message}`);
    }
    
    console.log('\\n' + '='.repeat(60));
    
    // 測試 2: 多源摘要
    console.log('📝 測試 2: 多源知識摘要');
    console.log('-'.repeat(40));
    
    const summaryRequest = {
      topic: '機器學習',
      depth: 'professional',
      purpose: 'presentation',
      timeLimit: 10,
      languages: ['zh', 'en'],
      format: 'summary'
    };
    
    const summaryResult = await service.multiSourceSummary(summaryRequest);
    
    if (summaryResult.success && summaryResult.data) {
      console.log(`✅ 主題: ${summaryResult.data.topic}`);
      console.log(`📊 處理時間: ${summaryResult.data.processingTime}ms`);
      console.log(`🎯 深度: ${summaryResult.data.depth}`);
      console.log(`📚 來源: ${summaryResult.data.sources.map(s => s.source).join(', ')}`);
      console.log(`📖 內容章節: ${summaryResult.data.content.detailedSections.length}`);
    } else {
      console.log(`❌ 多源摘要測試失敗: ${summaryResult.error?.message}`);
    }
    
    console.log('\\n' + '='.repeat(60));
    
    // 測試 3: Podcast 腳本生成
    console.log('📝 測試 3: Podcast 腳本生成');
    console.log('-'.repeat(40));
    
    const podcastResult = await service.generatePodcastScript('區塊鏈技術', 15);
    
    if (podcastResult.success && podcastResult.data) {
      console.log(`✅ 標題: ${podcastResult.data.title}`);
      console.log(`⏱️ 時長: ${podcastResult.data.duration} 分鐘`);
      console.log(`🎯 目標聽眾: ${podcastResult.data.metadata.targetAudience}`);
      console.log(`📝 段落數: ${podcastResult.data.segments.length}`);
      console.log(`🔄 轉場用語: ${podcastResult.data.transitions.length}`);
    } else {
      console.log(`❌ Podcast 腳本測試失敗: ${podcastResult.error?.message}`);
    }
    
    console.log('\\n' + '='.repeat(60));
    
    // 測試 4: 知識卡片
    console.log('📝 測試 4: 知識卡片生成');
    console.log('-'.repeat(40));
    
    const cardsResult = await service.formatKnowledgeCards('數據科學');
    
    if (cardsResult.success && cardsResult.data) {
      console.log(`✅ 主題: 數據科學`);
      console.log(`📇 卡片數量: ${cardsResult.data.length}`);
      cardsResult.data.forEach((card, index) => {
        console.log(`   ${index + 1}. ${card.topic} (${card.category})`);
      });
    } else {
      console.log(`❌ 知識卡片測試失敗: ${cardsResult.error?.message}`);
    }
    
    console.log('\\n' + '='.repeat(60));
    console.log('🎉 所有測試完成!');
    
  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error);
  } finally {
    // 清理資源
    await service.terminate();
    console.log('🔚 服務已關閉');
  }
}

// 執行測試
runTests().catch(error => {
  console.error('測試腳本執行失敗:', error);
  process.exit(1);
});