#!/usr/bin/env node

/**
 * 文本深化處理功能測試
 * 測試階段三的智能文本處理管道
 */

import { TextProcessingService } from './dist/services/TextProcessingService.js';

async function testTextProcessing() {
  console.log('🧠 開始測試文本深化處理功能...\n');
  
  const textProcessingService = new TextProcessingService();
  
  try {
    await textProcessingService.initialize();
    console.log('✅ TextProcessingService 初始化成功\n');
    
    // 測試文本
    const testText = `
# 人工智能的發展與應用

## 引言
人工智能（Artificial Intelligence, AI）是計算機科學的一個重要分支，致力於創造能夠執行通常需要人類智能的任務的機器。自1950年代以來，人工智能經歷了多次發展浪潮。

## 方法論
當前主流的人工智能方法包括機器學習、深度學習和自然語言處理。機器學習算法通過數據訓練來提高性能，而深度學習使用多層神經網絡來模擬人腦的工作方式。

## 應用領域
人工智能在多個領域都有重要應用：

1. **醫療診斷**：AI系統可以分析醫學影像，協助醫生診斷疾病
2. **自動駕駛**：通過計算機視覺和傳感器融合技術實現車輛自主導航
3. **語音識別**：將語音信號轉換為文本，廣泛應用於智能助手

## 結論
人工智能技術正在快速發展，對社會和經濟產生深遠影響。然而，我們也需要關注AI的倫理問題和潛在風險，確保技術發展符合人類利益。

## 參考文獻
1. Russell, S., & Norvig, P. (2020). Artificial Intelligence: A Modern Approach
2. Goodfellow, I., Bengio, Y., & Courville, A. (2016). Deep Learning
    `;
    
    console.log('📄 測試文本長度:', testText.length, '字符\n');
    
    // 執行深度文本分析
    console.log('🚀 執行深度文本分析...');
    const startTime = Date.now();
    
    const result = await textProcessingService.processText(testText, 'test-document');
    
    const processingTime = Date.now() - startTime;
    console.log(`⏱️  處理時間: ${processingTime}ms\n`);
    
    if (result.success && result.data) {
      const data = result.data;
      
      console.log('📊 === 分析結果統計 ===');
      console.log(`📝 總字數: ${data.metadata.statistics.totalWords}`);
      console.log(`📄 章節數: ${data.metadata.statistics.totalSections}`);
      console.log(`🔍 關鍵詞數: ${data.metadata.statistics.totalKeywords}`);
      console.log(`🧩 概念節點數: ${data.metadata.statistics.totalConcepts}`);
      console.log(`🎯 信心度: ${(data.metadata.confidence * 100).toFixed(1)}%\n`);
      
      // 測試章節分割
      console.log('📚 === 章節分割結果 ===');
      data.sections.forEach((section, index) => {
        console.log(`${index + 1}. "${section.title}" (${section.type}, ${section.wordCount} 詞, 信心度: ${(section.confidence * 100).toFixed(1)}%)`);
      });
      console.log();
      
      // 測試關鍵詞提取
      console.log('🔍 === 關鍵詞提取結果 (前10個) ===');
      data.keywords.slice(0, 10).forEach((keyword, index) => {
        console.log(`${index + 1}. "${keyword.term}" (${keyword.category}, 相關性: ${keyword.relevanceScore.toFixed(3)})`);
      });
      console.log();
      
      // 測試概念圖構建
      console.log('🗺️ === 概念圖構建結果 (前5個) ===');
      data.conceptMap.slice(0, 5).forEach((concept, index) => {
        console.log(`${index + 1}. "${concept.name}" (${concept.type}, 重要性: ${concept.importance.toFixed(2)}, 連接數: ${concept.connections.length})`);
        
        if (concept.connections.length > 0) {
          console.log(`   關聯: ${concept.connections.slice(0, 2).map(c => {
            const target = data.conceptMap.find(node => node.id === c.targetId);
            return target ? `${c.relationshipType} → ${target.name}` : `${c.relationshipType} → ${c.targetId}`;
          }).join(', ')}`);
        }
      });
      console.log();
      
      // 測試多層摘要生成
      console.log('📝 === 多層摘要生成結果 ===');
      console.log(`🟢 基礎層 (${data.summaries.basic.readingTime} 分鐘):`);
      console.log(`   ${data.summaries.basic.content.substring(0, 100)}...`);
      console.log(`   關鍵點數: ${data.summaries.basic.keyPoints.length}`);
      
      console.log(`🟡 專業層 (${data.summaries.professional.readingTime} 分鐘):`);
      console.log(`   ${data.summaries.professional.content.substring(0, 100)}...`);
      console.log(`   技術術語: ${data.summaries.professional.technicalTerms.length} 個`);
      
      console.log(`🔴 學術層 (${data.summaries.academic.readingTime} 分鐘):`);
      console.log(`   ${data.summaries.academic.content.substring(0, 100)}...`);
      console.log(`   研究發現: ${data.summaries.academic.findings.length} 項`);
      console.log(`   研究限制: ${data.summaries.academic.limitations.length} 項`);
      console.log();
      
      // 功能評估
      console.log('🎯 === 功能評估 ===');
      
      const evaluations = [
        {
          name: '章節分割',
          score: data.sections.length >= 4 ? 100 : (data.sections.length / 4 * 100),
          criteria: '識別了至少4個章節'
        },
        {
          name: '關鍵詞提取',
          score: data.keywords.length >= 10 ? 100 : (data.keywords.length / 10 * 100),
          criteria: '提取了至少10個關鍵詞'
        },
        {
          name: '概念圖構建',
          score: data.conceptMap.length >= 5 ? 100 : (data.conceptMap.length / 5 * 100),
          criteria: '構建了至少5個概念節點'
        },
        {
          name: '多層摘要',
          score: (data.summaries.basic.content.length > 50 && 
                  data.summaries.professional.content.length > 100 && 
                  data.summaries.academic.content.length > 150) ? 100 : 60,
          criteria: '生成了三個層次的摘要'
        },
        {
          name: '處理性能',
          score: processingTime < 5000 ? 100 : (5000 / processingTime * 100),
          criteria: '處理時間少於5秒'
        }
      ];
      
      let totalScore = 0;
      evaluations.forEach(evaluation => {
        const score = Math.round(evaluation.score);
        const status = score >= 80 ? '✅' : score >= 60 ? '⚠️' : '❌';
        console.log(`${status} ${evaluation.name}: ${score}/100 (${evaluation.criteria})`);
        totalScore += score;
      });
      
      const overallScore = Math.round(totalScore / evaluations.length);
      console.log(`\n🏆 === 整體評分: ${overallScore}/100 ===`);
      
      if (overallScore >= 80) {
        console.log('🎉 文本深化處理功能測試通過！階段三實現成功！');
      } else if (overallScore >= 60) {
        console.log('⚠️  文本深化處理功能基本可用，但需要進一步優化。');
      } else {
        console.log('❌ 文本深化處理功能需要重大改進。');
      }
      
    } else {
      console.error('❌ 文本處理失敗:', result.error);
    }
    
  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error);
  } finally {
    await textProcessingService.terminate();
    console.log('\n🔚 測試完成');
  }
}

// 執行測試
testTextProcessing().catch(console.error);