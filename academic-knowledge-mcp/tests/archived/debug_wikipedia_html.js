#!/usr/bin/env node

import { WikipediaEngine } from './dist/engines/WikipediaEngine.js';
import * as cheerio from 'cheerio';

async function debugWikipediaHtml() {
  console.log('🧪 調試 Wikipedia HTML 結構');
  
  const engine = new WikipediaEngine();
  await engine.initialize();
  
  // 檢查緩存的 HTML 內容
  const cacheFile = 'cache/wikipedia/raw/zh/_____zh/_____zh.bin';
  
  try {
    const fs = await import('fs');
    const htmlContent = fs.readFileSync(cacheFile, 'utf-8');
    
    console.log('📄 HTML 內容長度:', htmlContent.length);
    
    const $ = cheerio.load(htmlContent);
    
    // 檢查主要結構
    console.log('\n🔍 HTML 結構分析:');
    console.log('  #mw-content-text 存在:', $('#mw-content-text').length > 0);
    console.log('  .mw-parser-output 存在:', $('.mw-parser-output').length > 0);
    console.log('  #firstHeading 存在:', $('#firstHeading').length > 0);
    
    // 檢查標題
    const title = $('#firstHeading').text().trim();
    console.log('  頁面標題:', title);
    
    // 檢查章節標題
    const headers = $('h2, h3, h4, h5, h6');
    console.log('  找到標題數量:', headers.length);
    
    if (headers.length > 0) {
      console.log('  前 5 個標題:');
      headers.slice(0, 5).each((i, el) => {
        const $el = $(el);
        const headline = $el.find('.mw-headline');
        const text = headline.length > 0 ? headline.text() : $el.text();
        console.log(`    ${el.tagName}: "${text.trim()}"`);
      });
    }
    
    // 檢查 InfoBox
    const infoboxes = $('.infobox, .infobox-table, [class*="infobox"]');
    console.log('  找到 InfoBox 數量:', infoboxes.length);
    
    if (infoboxes.length > 0) {
      console.log('  InfoBox 類別:', infoboxes.first().attr('class'));
    }
    
    // 檢查第一段
    const firstParagraph = $('#mw-content-text .mw-parser-output > p').first();
    console.log('  第一段存在:', firstParagraph.length > 0);
    console.log('  第一段長度:', firstParagraph.text().length);
    
  } catch (error) {
    console.error('❌ 讀取緩存文件失敗:', error.message);
  }
}

debugWikipediaHtml().catch(console.error);