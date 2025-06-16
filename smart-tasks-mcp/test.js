#!/usr/bin/env node

// 簡單的MCP工具測試腳本
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function testMCPTool() {
  console.log('🧪 測試Smart Tasks MCP工具...\n');
  
  const mcpProcess = spawn('node', [join(__dirname, 'dist/index.js')], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let responseReceived = false;

  // 測試工具列表請求
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  };

  mcpProcess.stdout.on('data', (data) => {
    const response = data.toString();
    console.log('📨 MCP回應:', response);
    responseReceived = true;
    
    try {
      const parsed = JSON.parse(response);
      if (parsed.result && parsed.result.tools) {
        console.log('✅ 成功檢測到工具:', parsed.result.tools.map(t => t.name).join(', '));
      }
    } catch (e) {
      console.log('⚠️ 解析回應時發生錯誤:', e.message);
    }
    
    mcpProcess.kill();
  });

  mcpProcess.stderr.on('data', (data) => {
    console.error('❌ 錯誤:', data.toString());
  });

  mcpProcess.on('close', (code) => {
    if (responseReceived) {
      console.log('\n🎉 測試完成！MCP工具似乎正常運作');
    } else {
      console.log('\n❌ 測試失敗：沒有收到回應');
    }
    console.log(`進程退出代碼: ${code}`);
  });

  // 發送測試請求
  setTimeout(() => {
    mcpProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n');
  }, 100);

  // 超時保護
  setTimeout(() => {
    if (!responseReceived) {
      console.log('\n⏰ 測試超時，終止進程');
      mcpProcess.kill();
    }
  }, 5000);
}

testMCPTool();