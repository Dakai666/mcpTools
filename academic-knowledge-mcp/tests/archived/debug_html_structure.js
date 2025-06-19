#!/usr/bin/env node

import * as cheerio from 'cheerio';
import * as fs from 'fs';

async function debugHtmlStructure() {
  console.log('🔍 調試 HTML 詳細結構');
  
  const cacheFile = 'cache/wikipedia/raw/zh/_____zh/_____zh.bin';
  const htmlContent = fs.readFileSync(cacheFile, 'utf-8');
  
  const $ = cheerio.load(htmlContent);
  const mainContent = $('#mw-content-text .mw-parser-output');
  
  // 找到第一個 h2 標題
  const firstH2 = mainContent.find('h2').first();
  console.log('📄 第一個 H2 標題:', firstH2.text().trim());
  
  // 檢查緊跟著的 5 個元素
  console.log('\\n📋 H2 標題後的元素:');
  let current = firstH2.next();
  for (let i = 0; i < 8 && current.length > 0; i++) {
    const tagName = current.get(0)?.tagName?.toLowerCase() || 'unknown';
    const className = current.attr('class') || '';
    const text = current.text().trim();
    
    console.log(`${i + 1}. <${tagName}> class="${className}" text_length=${text.length}`);
    console.log(`   文字: "${text.substring(0, 150)}${text.length > 150 ? '...' : ''}"`);
    
    // 如果是段落，顯示更多信息
    if (tagName === 'p' && text.length > 0) {
      console.log(`   ** 這是有內容的段落! **`);
    }
    
    current = current.next();
  }
  
  // 檢查完整的段落
  console.log('\\n📖 所有段落:');
  mainContent.find('p').slice(0, 5).each((i, el) => {
    const text = $(el).text().trim();
    if (text.length > 10) {
      console.log(`段落 ${i + 1}: ${text.length} 字符 - "${text.substring(0, 100)}..."`);
    }
  });
}

debugHtmlStructure().catch(console.error);