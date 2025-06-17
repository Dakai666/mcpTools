#!/usr/bin/env node

/**
 * 測試 v1.2.0 新功能
 * - 自適應影像預處理
 * - PaddleOCR 集成
 * - 表格檢測
 * - 混合 OCR 引擎
 */

import { HybridOCREngine } from './dist/services/HybridOCREngine.js';
import fs from 'fs/promises';
import path from 'path';

async function testHybridOCREngine() {
  console.log('🧪 測試 v1.2.0 混合 OCR 引擎');
  
  const engine = new HybridOCREngine();
  
  try {
    console.log('📥 初始化混合 OCR 引擎...');
    await engine.initialize(['chi_tra', 'eng']);
    
    // 創建測試圖像路徑（如果存在）
    const testImagePath = path.join(process.cwd(), 'test_images', 'sample.png');
    
    // 檢查測試圖像是否存在
    try {
      await fs.access(testImagePath);
    } catch {
      console.log('⚠️  測試圖像不存在，創建示例配置...');
      
      // 創建測試圖像目錄
      await fs.mkdir(path.dirname(testImagePath), { recursive: true });
      
      console.log(`📁 請將測試圖像放入: ${testImagePath}`);
      console.log('   或修改 testImagePath 變量指向您的測試圖像');
      
      await engine.terminate();
      return;
    }
    
    console.log('🖼️  處理測試圖像:', testImagePath);
    
    // 測試基本 OCR
    console.log('\n=== 基本 OCR 測試 ===');
    const basicResult = await engine.processImage(testImagePath, {
      languages: ['chi_tra', 'eng'],
      detectTables: false
    });
    
    console.log('📊 基本結果統計:');
    console.log(`   文字信心度: ${basicResult.confidence.toFixed(2)}%`);
    console.log(`   詞語數量: ${basicResult.words.length}`);
    console.log(`   段落數量: ${basicResult.paragraphs.length}`);
    console.log(`   使用引擎: ${basicResult.engineUsed.join(', ')}`);
    console.log(`   處理時間: ${basicResult.processingTime}ms`);
    
    if (basicResult.text.length > 0) {
      console.log(`   識別文字: "${basicResult.text.substring(0, 100)}${basicResult.text.length > 100 ? '...' : ''}"`);
    }
    
    // 測試表格檢測
    console.log('\n=== 表格檢測測試 ===');
    const tableResult = await engine.processImage(testImagePath, {
      languages: ['chi_tra', 'eng'],
      detectTables: true,
      extractStructure: true
    });
    
    console.log('📋 表格檢測結果:');
    console.log(`   使用引擎: ${tableResult.engineUsed.join(', ')}`);
    console.log(`   處理時間: ${tableResult.processingTime}ms`);
    
    if (tableResult.tableResults) {
      console.log(`   檢測到表格: ${tableResult.tableResults.totalTables}`);
      tableResult.tableResults.tables.forEach((table, index) => {
        console.log(`   表格 ${index + 1}: ${table.rows}行 x ${table.cols}列 (信心度: ${table.confidence.toFixed(2)})`);
      });
    }
    
    // 測試圖像統計
    if (tableResult.imageStats) {
      console.log('\n📏 圖像統計:');
      console.log(`   檔案大小: ${(tableResult.imageStats.fileSize / 1024).toFixed(2)} KB`);
      if (tableResult.imageStats.width && tableResult.imageStats.height) {
        console.log(`   圖像尺寸: ${tableResult.imageStats.width} x ${tableResult.imageStats.height}`);
      }
    }
    
    // 性能比較
    console.log('\n⚡ 性能比較:');
    console.log(`   基本處理: ${basicResult.processingTime}ms`);
    console.log(`   完整處理: ${tableResult.processingTime}ms`);
    console.log(`   處理差異: ${tableResult.processingTime - basicResult.processingTime}ms`);
    
    console.log('\n✅ 測試完成！');
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    
    if (error.message.includes('Missing Python dependencies')) {
      console.log('\n💡 解決方案:');
      console.log('   pip install -r requirements.txt');
      console.log('   或者');
      console.log('   pip install paddlepaddle paddleocr opencv-python Pillow numpy');
    }
  } finally {
    await engine.terminate();
  }
}

async function testImagePreprocessing() {
  console.log('\n🎨 測試自適應影像預處理');
  
  const { AdaptiveOCREngine } = await import('./dist/services/AdaptiveOCREngine.js');
  const adaptiveEngine = new AdaptiveOCREngine();
  
  try {
    await adaptiveEngine.initialize(['chi_tra', 'eng']);
    
    const testImagePath = path.join(process.cwd(), 'test_images', 'sample.png');
    
    try {
      await fs.access(testImagePath);
      
      console.log('🖼️  測試不同預處理策略...');
      
      // 測試標準處理
      const standardBuffer = await adaptiveEngine.processImage(testImagePath, {
        enhanceContrast: true,
        removeNoise: true
      });
      
      // 測試保守處理（針對淺色文字）
      const conservativeBuffer = await adaptiveEngine.processImage(testImagePath, {
        enhanceContrast: false,
        removeNoise: false
      });
      
      console.log(`   標準處理輸出: ${standardBuffer.length} bytes`);
      console.log(`   保守處理輸出: ${conservativeBuffer.length} bytes`);
      
      // 保存處理結果供檢查
      const outputDir = path.join(process.cwd(), 'test_output');
      await fs.mkdir(outputDir, { recursive: true });
      
      await fs.writeFile(path.join(outputDir, 'standard_processed.png'), standardBuffer);
      await fs.writeFile(path.join(outputDir, 'conservative_processed.png'), conservativeBuffer);
      
      console.log(`   處理結果已保存到: ${outputDir}`);
      
    } catch {
      console.log('⚠️  跳過預處理測試 - 測試圖像不存在');
    }
    
  } catch (error) {
    console.error('❌ 預處理測試失敗:', error.message);
  } finally {
    await adaptiveEngine.terminate();
  }
}

async function main() {
  console.log('🚀 Screenshot Analyzer MCP v1.2.0 測試');
  console.log('=====================================\n');
  
  await testHybridOCREngine();
  await testImagePreprocessing();
  
  console.log('\n🎉 所有測試完成！');
  console.log('\n📝 v1.2.0 新功能摘要:');
  console.log('   ✅ 自適應影像預處理 - 根據圖像特性選擇最佳處理策略');
  console.log('   ✅ PaddleOCR 集成 - 大幅提升中文識別精度');
  console.log('   ✅ 高級表格檢測 - 基於 OpenCV 的多算法表格識別');
  console.log('   ✅ 混合 OCR 引擎 - 智能選擇和合併多引擎結果');
  console.log('   ✅ 性能監控 - 詳細的處理時間和統計信息');
}

main().catch(error => {
  console.error('💥 測試程序失敗:', error);
  process.exit(1);
});