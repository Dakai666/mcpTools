#!/usr/bin/env node

/**
 * Phase 3 高級功能測試 - 跨源關聯和知識圖譜
 * 測試 CrossSourceCorrelationService 和 KnowledgeGraphService
 */

import { CrossSourceCorrelationService } from './dist/services/CrossSourceCorrelationService.js';
import { KnowledgeGraphService } from './dist/services/KnowledgeGraphService.js';

async function testPhase3Advanced() {
  console.log('🚀 開始 Phase 3 高級功能測試...\n');
  
  // 模擬三個不同來源的內容
  const testSources = [
    {
      source: 'wikipedia',
      content: `
        人工智能（Artificial Intelligence, AI）是一個快速發展的技術領域。它由Alan Turing在1950年提出了著名的圖靈測試。
        機器學習是人工智能的核心技術，包括監督學習、無監督學習和強化學習三大類。
        深度學習使用神經網絡來模擬人腦的工作方式，在圖像識別和自然語言處理方面取得重大突破。
        OpenAI公司開發了GPT系列模型，代表了語言模型的最新發展。
        人工智能的應用包括醫療診斷、自動駕駛、智能助手等多個領域。
      `,
      metadata: { type: 'encyclopedia', reliability: 0.9 }
    },
    {
      source: 'arxiv',
      content: `
        Recent advances in artificial intelligence have been driven by deep learning algorithms.
        Transformer architectures, introduced by Vaswani et al. in 2017, revolutionized natural language processing.
        Geoffrey Hinton, known as the godfather of deep learning, has made significant contributions to neural network research.
        Large language models like GPT-3 and GPT-4 demonstrate emergent capabilities in few-shot learning.
        Machine learning techniques are being applied to solve complex problems in computer vision, speech recognition, and robotics.
        The field faces challenges including interpretability, bias, and computational efficiency.
      `,
      metadata: { type: 'academic', reliability: 0.95 }
    },
    {
      source: 'tech-news',
      content: `
        人工智能產業正在經歷快速增長，預計到2030年市場規模將達到1萬億美元。
        Google、Microsoft、Facebook等科技巨頭在AI領域投入巨資進行研究開發。
        ChatGPT的發布引發了新一輪AI熱潮，各種AI應用如雨後春筍般出現。
        然而，AI技術也帶來了就業、隱私和倫理等方面的挑戰和爭議。
        專家預測，人工智能將在醫療、教育、金融等領域產生深遠影響。
        監管部門開始關注AI的風險管控和倫理規範問題。
      `,
      metadata: { type: 'news', reliability: 0.7 }
    }
  ];

  try {
    // 測試 1: 跨源內容關聯分析
    console.log('🔗 測試 1: 跨源內容關聯分析');
    console.log('=' .repeat(50));
    
    const correlationService = new CrossSourceCorrelationService();
    await correlationService.initialize();
    
    const correlationResult = await correlationService.correlateContent(testSources);
    
    let correlationScore = 0;
    
    if (correlationResult.success && correlationResult.data) {
      console.log('✅ 跨源關聯分析成功');
      
      const data = correlationResult.data;
      console.log(`📊 統計信息:`);
      console.log(`   - 識別實體: ${data.entities.length} 個`);
      console.log(`   - 時間事件: ${data.timeline.length} 個`);
      console.log(`   - 觀點比較: ${data.perspectives.length} 個主題`);
      console.log(`   - 整體可信度: ${(data.credibility.overall * 100).toFixed(1)}%`);
      
      // 評分標準
      if (data.entities.length >= 5) correlationScore += 25;
      if (data.timeline.length >= 2) correlationScore += 20;
      if (data.perspectives.length >= 1) correlationScore += 25;
      if (data.credibility.overall >= 0.7) correlationScore += 20;
      if (data.correlationMatrix.length >= 3) correlationScore += 10;
      
      console.log(`🎯 跨源關聯分析評分: ${correlationScore}/100`);
      
      // 顯示部分結果
      if (data.entities.length > 0) {
        console.log(`\n🧩 關鍵實體 (前3個):`);
        data.entities.slice(0, 3).forEach((entity, index) => {
          console.log(`   ${index + 1}. ${entity.mainName} (${entity.entityType}) - 信心度: ${(entity.confidence * 100).toFixed(1)}%`);
        });
      }
      
    } else {
      console.log('❌ 跨源關聯分析失敗:', correlationResult.error);
    }
    
    console.log('\n');
    
    // 測試 2: 知識圖譜構建（優化版本）
    console.log('🗺️ 測試 2: 知識圖譜構建');
    console.log('=' .repeat(50));
    
    const graphService = new KnowledgeGraphService();
    await graphService.initialize();
    
    // 簡化測試數據以避免超時
    const simplifiedSources = testSources.slice(0, 2).map(source => ({
      source: source.source,
      content: source.content.substring(0, 500), // 縮短內容
      entities: correlationResult.data?.entities?.slice(0, 5) || [], // 限制實體數量
      correlations: correlationResult.data?.correlationMatrix?.slice(0, 3) || []
    }));
    
    console.log(`📊 處理 ${simplifiedSources.length} 個簡化來源...`);
    const graphResult = await graphService.buildKnowledgeGraph(simplifiedSources);
    
    let graphScore = 0;
    
    if (graphResult.success && graphResult.data) {
      console.log('✅ 知識圖譜構建成功');
      
      const graph = graphResult.data;
      console.log(`📊 圖譜統計:`);
      console.log(`   - 節點數量: ${graph.metadata.totalNodes} 個`);
      console.log(`   - 關係數量: ${graph.metadata.totalEdges} 個`);
      console.log(`   - 信心度: ${(graph.metadata.confidence * 100).toFixed(1)}%`);
      console.log(`   - 來源數: ${graph.metadata.sources.length} 個`);
      
      // 評分標準
      if (graph.metadata.totalNodes >= 8) graphScore += 30;
      if (graph.metadata.totalEdges >= 5) graphScore += 25;
      if (graph.metadata.confidence >= 0.6) graphScore += 20;
      if (graph.clusters && graph.clusters.length >= 2) graphScore += 15;
      if (graph.paths && graph.paths.length >= 1) graphScore += 10;
      
      console.log(`🎯 知識圖譜構建評分: ${graphScore}/100`);
      
      // 顯示節點類型分布
      if (graph.metadata.categories) {
        console.log(`\n📈 節點類型分布:`);
        Object.entries(graph.metadata.categories).forEach(([type, count]) => {
          console.log(`   - ${type}: ${count} 個`);
        });
      }
      
      // 顯示重要節點
      if (graph.nodes.length > 0) {
        console.log(`\n🌟 重要節點 (前3個):`);
        const importantNodes = graph.nodes
          .sort((a, b) => b.properties.importance - a.properties.importance)
          .slice(0, 3);
        
        importantNodes.forEach((node, index) => {
          console.log(`   ${index + 1}. ${node.label} (${node.type}) - 重要性: ${(node.properties.importance * 100).toFixed(1)}%`);
        });
      }
      
      // 測試 3: 圖譜查詢功能
      console.log(`\n🔍 測試 3: 圖譜查詢功能`);
      console.log('-' .repeat(30));
      
      let queryScore = 0;
      
      // 測試統計查詢
      const statsResult = await graphService.queryGraph('getStatistics', {});
      if (statsResult.success && statsResult.data) {
        console.log('✅ 統計查詢成功');
        console.log(`   - 平均度: ${statsResult.data.avgDegree.toFixed(2)}`);
        console.log(`   - 連通分量: ${statsResult.data.statistics.components}`);
        queryScore += 30;
      }
      
      // 測試集群查詢
      const clustersResult = await graphService.queryGraph('getClusters', {});
      if (clustersResult.success && clustersResult.data) {
        console.log('✅ 集群查詢成功');
        console.log(`   - 集群數量: ${clustersResult.data.clusters.length}`);
        queryScore += 25;
      }
      
      // 測試節點搜索
      const searchResult = await graphService.queryGraph('searchNodes', { query: 'AI', nodeType: 'Concept' });
      if (searchResult.success && searchResult.data) {
        console.log('✅ 節點搜索成功');
        console.log(`   - 找到節點: ${searchResult.data.totalCount} 個`);
        queryScore += 25;
      }
      
      // 測試鄰居查詢
      if (graph.nodes.length > 0) {
        const neighborResult = await graphService.queryGraph('getNeighbors', { 
          nodeId: graph.nodes[0].id, 
          depth: 1 
        });
        if (neighborResult.success && neighborResult.data) {
          console.log('✅ 鄰居查詢成功');
          console.log(`   - 鄰居節點: ${neighborResult.data.nodes.length} 個`);
          queryScore += 20;
        }
      }
      
      console.log(`🎯 圖譜查詢功能評分: ${queryScore}/100`);
      
    } else {
      console.log('❌ 知識圖譜構建失敗:', graphResult.error);
    }
    
    // 總體評估
    console.log('\n');
    console.log('🏆 Phase 3 高級功能總體評估');
    console.log('=' .repeat(50));
    
    const totalScore = Math.round((correlationScore + graphScore + (graphScore > 0 ? queryScore : 0)) / (graphScore > 0 ? 3 : 2));
    
    console.log(`📊 各項評分:`);
    console.log(`   - 跨源關聯分析: ${correlationScore}/100`);
    console.log(`   - 知識圖譜構建: ${graphScore}/100`);
    if (graphScore > 0) {
      console.log(`   - 圖譜查詢功能: ${queryScore}/100`);
    }
    console.log(`\n🎯 總體評分: ${totalScore}/100`);
    
    if (totalScore >= 80) {
      console.log('🎉 Phase 3 高級功能測試通過！系統已具備完整的跨源分析和知識圖譜能力！');
      console.log('✨ 準備進行端到端報告生成驗證...');
    } else if (totalScore >= 60) {
      console.log('⚠️  Phase 3 高級功能基本可用，但需要進一步優化。');
    } else {
      console.log('❌ Phase 3 高級功能需要重大改進。');
    }
    
    // 清理資源
    await correlationService.terminate();
    await graphService.terminate();
    
  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error);
  }
}

// 執行測試
testPhase3Advanced().catch(console.error);