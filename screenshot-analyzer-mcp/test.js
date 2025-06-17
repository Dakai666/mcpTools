#!/usr/bin/env node

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

// 測試 MCP 工具
async function testMCPTools() {
  console.log('🧪 測試 Screenshot Analyzer MCP 工具...\n');

  // 測試工具列表
  const testCases = [
    {
      name: 'list_tools',
      description: '列出可用工具',
      request: {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list'
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`📋 測試: ${testCase.description}`);
    
    try {
      const result = await sendMCPRequest(testCase.request);
      console.log('✅ 成功');
      console.log('回應:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.log('❌ 失敗:', error.message);
    }
    
    console.log('---\n');
  }
}

// 發送 MCP 請求
function sendMCPRequest(request) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data;
    });

    child.stderr.on('data', (data) => {
      stderr += data;
    });

    child.on('close', (code) => {
      if (code === 0) {
        try {
          const response = JSON.parse(stdout);
          resolve(response);
        } catch (error) {
          reject(new Error(`無法解析回應: ${stdout}`));
        }
      } else {
        reject(new Error(`程序退出碼: ${code}, 錯誤: ${stderr}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });

    // 發送請求
    child.stdin.write(JSON.stringify(request) + '\n');
    child.stdin.end();
  });
}

// 建立測試檔案
async function createTestFiles() {
  console.log('📁 建立測試目錄和檔案...');
  
  const testDir = path.join(process.cwd(), 'test-images');
  
  try {
    await fs.mkdir(testDir, { recursive: true });
    console.log('✅ 測試目錄建立成功');
    
    // 建立 README
    const readmeContent = `# 測試圖片目錄

請將要測試的截圖檔案放在這個目錄中。

支援的格式：
- PNG
- JPEG
- BMP
- TIFF

## 使用範例

\`\`\`bash
# 編譯專案
npm run build

# 分析截圖
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"analyze_screenshot","arguments":{"imagePath":"./test-images/screenshot.png"}}}' | node dist/index.js

# 僅提取文字
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"extract_text_only","arguments":{"imagePath":"./test-images/screenshot.png"}}}' | node dist/index.js
\`\`\`
`;
    
    await fs.writeFile(path.join(testDir, 'README.md'), readmeContent);
    console.log('✅ README 建立成功');
    
  } catch (error) {
    console.log('❌ 建立測試檔案失敗:', error.message);
  }
}

// 檢查編譯
async function checkBuild() {
  console.log('🔧 檢查編譯...');
  
  try {
    const distExists = await fs.access('dist').then(() => true).catch(() => false);
    if (!distExists) {
      console.log('⚠️  dist 目錄不存在，需要先編譯');
      return false;
    }
    
    const indexExists = await fs.access('dist/index.js').then(() => true).catch(() => false);
    if (!indexExists) {
      console.log('⚠️  dist/index.js 不存在，需要先編譯');
      return false;
    }
    
    console.log('✅ 編譯檔案存在');
    return true;
  } catch (error) {
    console.log('❌ 檢查編譯失敗:', error.message);
    return false;
  }
}

// 主測試函數
async function main() {
  console.log('🚀 Screenshot Analyzer MCP 測試開始\n');
  
  // 建立測試檔案
  await createTestFiles();
  console.log();
  
  // 檢查編譯
  const buildReady = await checkBuild();
  console.log();
  
  if (!buildReady) {
    console.log('請先執行: npm run build');
    return;
  }
  
  // 執行測試
  await testMCPTools();
  
  console.log('🎉 測試完成！');
}

main().catch(console.error);