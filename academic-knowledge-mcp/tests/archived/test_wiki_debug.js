#!/usr/bin/env node

import { WikipediaEngine } from './dist/engines/WikipediaEngine.js';

async function testWiki() {
  console.log('🧪 測試 WikipediaEngine smartSearch 方法');
  
  const engine = new WikipediaEngine();
  await engine.initialize();
  console.log('✅ WikipediaEngine 初始化完成');
  
  const result = await engine.smartSearch('黑洞', 'basic');
  console.log('🔍 搜索結果:');
  console.log('  成功:', result.success);
  console.log('  數據存在:', !!result.data);
  
  if (result.data) {
    console.log('  標題:', result.data.title);
    console.log('  摘要長度:', result.data.summary.length);
    console.log('  章節數量:', result.data.sections.length);
    console.log('  分類數量:', result.data.categories.length);
    console.log('  InfoBox 欄位:', Object.keys(result.data.infobox).length);
    console.log('\n📖 摘要前 300 字符:');
    console.log(result.data.summary.substring(0, 300));
  } else {
    console.log('❌ 錯誤:', result.error);
  }
}

testWiki().catch(console.error);