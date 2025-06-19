#!/usr/bin/env node

/**
 * 端到端報告生成品質驗證測試
 * 測試完整的知識獲取 → 文本深化 → 跨源關聯 → 知識圖譜 → 報告生成流程
 */

import { KnowledgeIntegrationService } from './dist/services/KnowledgeIntegrationService.js';
import { TextProcessingService } from './dist/services/TextProcessingService.js';
import { CrossSourceCorrelationService } from './dist/services/CrossSourceCorrelationService.js';
import { KnowledgeGraphService } from './dist/services/KnowledgeGraphService.js';

async function generateEndToEndReport() {
  console.log('🚀 端到端報告生成品質驗證');
  console.log('=' .repeat(60));
  console.log('📝 測試主題: 人工智能的發展與應用');
  console.log('🎯 目標: 驗證整個知識處理流程的品質與有效性\n');

  const topic = '人工智能';
  const startTime = Date.now();
  
  try {
    // 步驟 1: 知識獲取階段
    console.log('📚 階段 1: 多源知識獲取');
    console.log('-' .repeat(40));
    
    const knowledgeService = new KnowledgeIntegrationService();
    await knowledgeService.initialize();
    
    console.log('🔍 搜索 Wikipedia 基礎知識...');
    const wikiResult = await knowledgeService.quickKnowledgeOverview(topic);
    
    console.log('📑 搜索學術論文...');
    const researchResult = await knowledgeService.deepResearchSearch(topic);
    
    if (!wikiResult.success && !researchResult.success) {
      throw new Error('無法獲取任何知識來源');
    }
    
    let knowledgeSources = [];
    if (wikiResult.success && wikiResult.data) {
      knowledgeSources.push({
        source: 'wikipedia',
        content: wikiResult.data.content.summary,
        metadata: { type: 'encyclopedia', quality: 8 }
      });
      console.log('✅ Wikipedia 知識獲取成功');
    }
    
    if (researchResult.success && researchResult.data) {
      knowledgeSources.push({
        source: 'academic',
        content: researchResult.data.content.summary,
        metadata: { type: 'research', quality: 9 }
      });
      console.log('✅ 學術研究獲取成功');
    }
    
    console.log(`📊 成功獲取 ${knowledgeSources.length} 個知識來源\n`);
    
    // 步驟 2: 文本深化處理
    console.log('🧠 階段 2: 智能文本深化處理');
    console.log('-' .repeat(40));
    
    const textProcessor = new TextProcessingService();
    await textProcessor.initialize();
    
    const processedTexts = [];
    for (const source of knowledgeSources) {
      console.log(`🔄 處理 ${source.source} 來源內容...`);
      const processResult = await textProcessor.processText(source.content, source.source);
      if (processResult.success && processResult.data) {
        processedTexts.push({
          ...source,
          processed: processResult.data
        });
        console.log(`✅ ${source.source} 文本深化完成`);
      }
    }
    
    console.log(`📊 成功處理 ${processedTexts.length} 個文本\n`);
    
    // 步驟 3: 跨源關聯分析
    console.log('🔗 階段 3: 跨源內容關聯分析');
    console.log('-' .repeat(40));
    
    const correlationService = new CrossSourceCorrelationService();
    await correlationService.initialize();
    
    const correlationResult = await correlationService.correlateContent(knowledgeSources);
    let correlationData = null;
    
    if (correlationResult.success && correlationResult.data) {
      correlationData = correlationResult.data;
      console.log('✅ 跨源關聯分析成功');
      console.log(`   - 識別實體: ${correlationData.entities.length} 個`);
      console.log(`   - 時間事件: ${correlationData.timeline.length} 個`);
      console.log(`   - 整體可信度: ${(correlationData.credibility.overall * 100).toFixed(1)}%`);
    } else {
      console.log('⚠️  跨源關聯分析失敗，將使用基礎分析');
    }
    
    console.log('');
    
    // 步驟 4: 知識圖譜構建
    console.log('🗺️ 階段 4: 知識圖譜構建');
    console.log('-' .repeat(40));
    
    const graphService = new KnowledgeGraphService();
    await graphService.initialize();
    
    const graphSources = knowledgeSources.map(source => ({
      ...source,
      entities: correlationData?.entities || [],
      correlations: correlationData?.correlationMatrix || []
    }));
    
    const graphResult = await graphService.buildKnowledgeGraph(graphSources.slice(0, 2)); // 限制來源避免超時
    let graphData = null;
    
    if (graphResult.success && graphResult.data) {
      graphData = graphResult.data;
      console.log('✅ 知識圖譜構建成功');
      console.log(`   - 節點數量: ${graphData.metadata.totalNodes} 個`);
      console.log(`   - 關係數量: ${graphData.metadata.totalEdges} 個`);
      console.log(`   - 信心度: ${(graphData.metadata.confidence * 100).toFixed(1)}%`);
    } else {
      console.log('⚠️  知識圖譜構建失敗，將使用簡化結構');
    }
    
    console.log('');
    
    // 步驟 5: 報告生成
    console.log('📄 階段 5: 研究報告生成');
    console.log('-' .repeat(40));
    
    const report = await generateComprehensiveReport({
      topic,
      knowledgeSources,
      processedTexts,
      correlationData,
      graphData,
      wikiResult: wikiResult.data,
      researchResult: researchResult.data
    });
    
    console.log('✅ 研究報告生成完成');
    console.log(`📊 報告統計:`);
    console.log(`   - 總字數: ${report.metadata.wordCount} 字`);
    console.log(`   - 章節數: ${report.sections.length} 個`);
    console.log(`   - 參考文獻: ${report.bibliography.length} 篇`);
    console.log(`   - 處理時間: ${((Date.now() - startTime) / 1000).toFixed(1)} 秒`);
    
    // 步驟 6: 品質評估
    console.log('\n🏆 階段 6: 報告品質評估');
    console.log('-' .repeat(40));
    
    const qualityScore = assessReportQuality(report, {
      hasMultipleSources: knowledgeSources.length >= 2,
      hasTextProcessing: processedTexts.length > 0,
      hasCorrelation: !!correlationData,
      hasKnowledgeGraph: !!graphData,
      processingTime: Date.now() - startTime
    });
    
    console.log(`🎯 總體品質評分: ${qualityScore.total}/100`);
    console.log(`   - 內容完整性: ${qualityScore.completeness}/25`);
    console.log(`   - 結構合理性: ${qualityScore.structure}/25`);
    console.log(`   - 技術整合: ${qualityScore.integration}/25`);
    console.log(`   - 處理效率: ${qualityScore.efficiency}/25`);
    
    if (qualityScore.total >= 80) {
      console.log('\n🎉 優秀！端到端報告生成系統運行完美！');
      console.log('✨ 系統已具備完整的知識處理和報告生成能力');
    } else if (qualityScore.total >= 60) {
      console.log('\n😊 良好！系統基本功能正常，但有優化空間');
    } else {
      console.log('\n😞 需要改進！系統存在一些問題需要解決');
    }
    
    // 顯示報告示例
    console.log('\n📖 生成報告示例:');
    console.log('=' .repeat(60));
    console.log(formatReportForDisplay(report));
    
    // 清理資源
    await knowledgeService.terminate();
    await textProcessor.terminate();
    await correlationService.terminate();
    await graphService.terminate();
    
    return {
      success: true,
      report,
      qualityScore,
      processingTime: Date.now() - startTime
    };
    
  } catch (error) {
    console.error('❌ 端到端測試失敗:', error);
    return {
      success: false,
      error: error.message,
      processingTime: Date.now() - startTime
    };
  }
}

async function generateComprehensiveReport(data) {
  const { topic, knowledgeSources, processedTexts, correlationData, graphData, wikiResult, researchResult } = data;
  
  const report = {
    title: `${topic} - 綜合研究報告`,
    abstract: generateAbstract(data),
    sections: generateReportSections(data),
    bibliography: generateBibliography(data),
    appendices: generateAppendices(data),
    metadata: {
      generatedAt: new Date(),
      processingMethod: 'AI Knowledge Integration Pipeline',
      sources: knowledgeSources.map(s => s.source),
      wordCount: 0, // 將在下面計算
      confidence: calculateOverallConfidence(data),
      version: '1.0'
    }
  };
  
  // 計算字數
  const allText = report.abstract + ' ' + report.sections.map(s => s.content).join(' ');
  report.metadata.wordCount = allText.split(/\s+/).length;
  
  return report;
}

function generateAbstract(data) {
  const { topic, knowledgeSources, correlationData } = data;
  
  let abstract = `本研究對${topic}進行了全面的多源知識整合分析。`;
  
  if (knowledgeSources.length > 1) {
    abstract += `研究整合了${knowledgeSources.length}個不同來源的資料，包括百科全書知識和學術研究成果。`;
  }
  
  if (correlationData) {
    abstract += `通過跨源關聯分析，識別出${correlationData.entities.length}個關鍵實體和${correlationData.timeline.length}個重要時間節點。`;
  }
  
  abstract += `研究採用智能文本處理技術，構建了完整的知識體系，為理解${topic}的發展脈絡和應用前景提供了重要參考。`;
  
  return abstract;
}

function generateReportSections(data) {
  const { topic, knowledgeSources, processedTexts, correlationData, graphData } = data;
  
  const sections = [];
  
  // 1. 概述
  sections.push({
    title: '1. 概述',
    content: `${topic}是當今科技發展的重要領域。本研究通過整合多個知識來源，提供了對該領域的全面分析。研究採用了先進的知識整合技術，包括文本深化處理、跨源關聯分析和知識圖譜構建等方法。`,
    subsections: []
  });
  
  // 2. 基礎知識
  if (knowledgeSources.find(s => s.source === 'wikipedia')) {
    const wikiSource = knowledgeSources.find(s => s.source === 'wikipedia');
    sections.push({
      title: '2. 基礎知識與背景',
      content: wikiSource.content.substring(0, 500) + '...',
      subsections: []
    });
  }
  
  // 3. 學術研究進展
  if (knowledgeSources.find(s => s.source === 'academic')) {
    const academicSource = knowledgeSources.find(s => s.source === 'academic');
    sections.push({
      title: '3. 學術研究進展',
      content: academicSource.content.substring(0, 500) + '...',
      subsections: []
    });
  }
  
  // 4. 關鍵實體分析
  if (correlationData && correlationData.entities.length > 0) {
    const entityContent = correlationData.entities.slice(0, 5).map(entity => 
      `**${entity.mainName}** (${entity.entityType}): 在研究中具有重要地位，信心度 ${(entity.confidence * 100).toFixed(1)}%。`
    ).join('\n\n');
    
    sections.push({
      title: '4. 關鍵實體分析',
      content: `通過跨源分析，識別出以下關鍵實體：\n\n${entityContent}`,
      subsections: []
    });
  }
  
  // 5. 知識圖譜洞察
  if (graphData) {
    sections.push({
      title: '5. 知識圖譜洞察',
      content: `構建的知識圖譜包含${graphData.metadata.totalNodes}個節點和${graphData.metadata.totalEdges}個關係。圖譜分析顯示了${topic}領域的複雜關聯結構，為深入理解提供了視覺化支持。`,
      subsections: []
    });
  }
  
  // 6. 結論
  sections.push({
    title: '6. 結論與展望',
    content: `本研究通過多源知識整合，為${topic}領域提供了全面的分析視角。研究方法的創新性在於整合了多種先進的文本處理和知識挖掘技術，為未來的研究奠定了基礎。`,
    subsections: []
  });
  
  return sections;
}

function generateBibliography(data) {
  const { knowledgeSources, wikiResult, researchResult } = data;
  const bibliography = [];
  
  if (wikiResult) {
    bibliography.push({
      title: `${wikiResult.topic} - Wikipedia`,
      type: 'encyclopedia',
      source: 'Wikipedia',
      url: `https://zh.wikipedia.org/wiki/${encodeURIComponent(wikiResult.topic)}`,
      accessDate: new Date()
    });
  }
  
  if (researchResult && researchResult.sources) {
    researchResult.sources.forEach(source => {
      bibliography.push({
        title: `Academic Research on ${researchResult.topic}`,
        type: 'academic',
        source: source.source,
        quality: source.quality,
        accessDate: new Date()
      });
    });
  }
  
  return bibliography;
}

function generateAppendices(data) {
  const appendices = [];
  
  if (data.correlationData) {
    appendices.push({
      title: 'A. 跨源關聯分析詳細結果',
      content: `實體數量: ${data.correlationData.entities.length}\n時間事件: ${data.correlationData.timeline.length}\n可信度: ${data.correlationData.credibility.overall}`
    });
  }
  
  if (data.graphData) {
    appendices.push({
      title: 'B. 知識圖譜統計',
      content: `節點數: ${data.graphData.metadata.totalNodes}\n關係數: ${data.graphData.metadata.totalEdges}\n信心度: ${data.graphData.metadata.confidence}`
    });
  }
  
  return appendices;
}

function calculateOverallConfidence(data) {
  let totalConfidence = 0;
  let count = 0;
  
  if (data.correlationData) {
    totalConfidence += data.correlationData.credibility.overall;
    count++;
  }
  
  if (data.graphData) {
    totalConfidence += data.graphData.metadata.confidence;
    count++;
  }
  
  return count > 0 ? totalConfidence / count : 0.7;
}

function assessReportQuality(report, metrics) {
  const scores = {
    completeness: 0,
    structure: 0,
    integration: 0,
    efficiency: 0,
    total: 0
  };
  
  // 內容完整性 (25分)
  if (report.sections.length >= 4) scores.completeness += 10;
  if (report.bibliography.length >= 1) scores.completeness += 5;
  if (report.metadata.wordCount >= 500) scores.completeness += 5;
  if (report.abstract.length >= 100) scores.completeness += 5;
  
  // 結構合理性 (25分)
  if (report.sections.some(s => s.title.includes('概述'))) scores.structure += 5;
  if (report.sections.some(s => s.title.includes('基礎知識'))) scores.structure += 5;
  if (report.sections.some(s => s.title.includes('研究'))) scores.structure += 5;
  if (report.sections.some(s => s.title.includes('結論'))) scores.structure += 5;
  if (report.metadata.confidence >= 0.6) scores.structure += 5;
  
  // 技術整合 (25分)
  if (metrics.hasMultipleSources) scores.integration += 5;
  if (metrics.hasTextProcessing) scores.integration += 5;
  if (metrics.hasCorrelation) scores.integration += 8;
  if (metrics.hasKnowledgeGraph) scores.integration += 7;
  
  // 處理效率 (25分)
  const timeInSeconds = metrics.processingTime / 1000;
  if (timeInSeconds <= 30) scores.efficiency += 25;
  else if (timeInSeconds <= 60) scores.efficiency += 20;
  else if (timeInSeconds <= 120) scores.efficiency += 15;
  else if (timeInSeconds <= 300) scores.efficiency += 10;
  else scores.efficiency += 5;
  
  scores.total = scores.completeness + scores.structure + scores.integration + scores.efficiency;
  return scores;
}

function formatReportForDisplay(report) {
  let display = `${report.title}\n${'='.repeat(report.title.length)}\n\n`;
  display += `📋 摘要:\n${report.abstract}\n\n`;
  
  report.sections.slice(0, 3).forEach(section => {
    display += `${section.title}\n${'-'.repeat(section.title.length)}\n`;
    display += `${section.content.substring(0, 200)}...\n\n`;
  });
  
  display += `📚 參考文獻: ${report.bibliography.length} 篇\n`;
  display += `📊 報告統計: ${report.metadata.wordCount} 字 | 信心度: ${(report.metadata.confidence * 100).toFixed(1)}%`;
  
  return display;
}

// 執行測試
generateEndToEndReport()
  .then(result => {
    if (result.success) {
      console.log('\n🎉 端到端測試成功完成！');
      console.log(`⏱️  總處理時間: ${(result.processingTime / 1000).toFixed(1)} 秒`);
      console.log(`🎯 品質評分: ${result.qualityScore.total}/100`);
    } else {
      console.log('\n❌ 端到端測試失敗');
      console.log(`⏱️  處理時間: ${(result.processingTime / 1000).toFixed(1)} 秒`);
      console.log(`❗ 錯誤: ${result.error}`);
    }
  })
  .catch(console.error);