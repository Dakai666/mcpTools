#!/usr/bin/env node

import { WikipediaEngine } from './dist/engines/WikipediaEngine.js';
import * as cheerio from 'cheerio';
import * as fs from 'fs';

async function debugSectionExtraction() {
  console.log('🧪 調試章節提取過程');
  
  // 直接讀取緩存的 HTML
  const cacheFile = 'cache/wikipedia/raw/zh/_____zh/_____zh.bin';
  const htmlContent = fs.readFileSync(cacheFile, 'utf-8');
  
  const $ = cheerio.load(htmlContent);
  const mainContent = $('#mw-content-text .mw-parser-output');
  
  console.log('📄 主內容區域存在:', mainContent.length > 0);
  
  // 手動模擬章節提取過程
  const sections = [];
  console.log('\n📖 開始提取章節...');
  
  mainContent.find('h2, h3, h4, h5, h6').each((i, element) => {
    const $element = $(element);
    const tagName = element.tagName?.toLowerCase();
    const level = parseInt(tagName?.charAt(1) || '2');
    
    // 獲取標題文本
    const $headline = $element.find('.mw-headline');
    let title = $headline.length > 0 ? $headline.text().trim() : $element.text().trim();
    
    // 清理標題
    title = title.replace(/\\[\\s*編輯\\s*\\]/g, '').replace(/\\[\\s*edit\\s*\\]/gi, '').trim();
    
    const anchor = $headline.attr('id') || title.toLowerCase().replace(/\\s+/g, '-');
    
    console.log(`  ${tagName.toUpperCase()}: "${title}" (level: ${level})`);
    
    if (title && title.length > 0 && !title.includes('編輯')) {
      // 簡化版內容提取
      let content = ''; 
      let contentLength = 0;
      
      // 查找下一個元素直到下一個標題
      let currentElement = $element.next();
      let elementCount = 0;
      
      while (currentElement.length > 0 && elementCount < 10) { // 限制循環防止無限循環
        const currentTag = currentElement.get(0)?.tagName?.toLowerCase();
        
        if (currentTag && /^h[1-6]$/.test(currentTag)) {
          const currentLevel = parseInt(currentTag.charAt(1));
          if (currentLevel <= level) {
            break; // 遇到同級或更高級標題，停止
          }
        }
        
        const elementText = currentElement.text().trim();
        if (elementText && elementText.length > 10) {
          contentLength += elementText.length;
          content += elementText.substring(0, 100) + '... ';
        }
        
        currentElement = currentElement.next();
        elementCount++;
      }
      
      console.log(`    內容長度: ${contentLength}, 處理元素: ${elementCount}`);
      
      sections.push({
        title,
        content: content.substring(0, 200),
        level,
        anchor
      });
    }
  });
  
  console.log(`\\n✅ 總共提取到 ${sections.length} 個章節`);
  
  if (sections.length > 0) {
    console.log('\\n📋 前 3 個章節:');
    sections.slice(0, 3).forEach((section, i) => {
      console.log(`${i + 1}. ${section.title} (${section.content.length} 字符)`);
      console.log(`   內容: ${section.content.substring(0, 100)}...`);
    });
  }
}

debugSectionExtraction().catch(console.error);