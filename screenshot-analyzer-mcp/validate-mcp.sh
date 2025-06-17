#!/bin/bash

echo "🔍 驗證 Screenshot Analyzer MCP 工具"
echo "================================="

# 檢查基本檔案
echo "📁 檢查檔案結構..."
if [ ! -f "start.sh" ]; then
    echo "❌ start.sh 不存在"
    exit 1
fi

if [ ! -f "dist/index.js" ]; then
    echo "❌ dist/index.js 不存在，請執行 npm run build"
    exit 1
fi

echo "✅ 檔案結構正確"

# 測試 MCP 協議
echo ""
echo "🧪 測試 MCP 協議..."

# 測試工具列表
echo "列出可用工具..."
response=$(echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | timeout 10 ./start.sh 2>/dev/null)

if [ $? -eq 0 ]; then
    # 簡單檢查回應是否包含預期的工具
    if echo "$response" | grep -q "analyze_screenshot" && \
       echo "$response" | grep -q "extract_text_only" && \
       echo "$response" | grep -q "get_image_metadata" && \
       echo "$response" | grep -q "preprocess_image"; then
        echo "✅ 成功載入所有 4 個工具:"
        echo "  - analyze_screenshot"
        echo "  - extract_text_only" 
        echo "  - get_image_metadata"
        echo "  - preprocess_image"
    else
        echo "❌ 工具載入不完整"
        echo "回應: $response"
        exit 1
    fi
else
    echo "❌ MCP 通訊失敗"
    exit 1
fi

echo ""
echo "🎉 Screenshot Analyzer MCP 工具驗證成功！"
echo ""
echo "📋 在 Cursor 中的設定："
echo '  "screenshot-analyzer-mcp": {'
echo '    "command": "/home/ubuntu24/corsor/mcpTool/screenshot-analyzer-mcp/start.sh"'
echo '  }'
echo ""
echo "💡 如果 Cursor 沒有偵測到工具，請："
echo "   1. 重新啟動 Cursor"
echo "   2. 檢查 ~/.cursor/mcp.json 設定"
echo "   3. 查看 Cursor 控制台錯誤訊息"