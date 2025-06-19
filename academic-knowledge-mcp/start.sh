#!/bin/bash

# Academic Knowledge Integration MCP Server 啟動腳本

# 設置 Node.js 環境
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# 切換到腳本所在目錄
cd "$(dirname "$0")"

echo "🚀 Starting Academic Knowledge Integration MCP Server..." >&2

# 檢查是否已編譯
if [ ! -d "dist" ]; then
    echo "⚙️ Building project..." >&2
    npm run build
fi

# 設置環境變量（可選）
# export SEMANTIC_SCHOLAR_API_KEY="your_api_key_here"

# 啟動服務器
echo "📚 Launching Academic Knowledge MCP Server..." >&2
exec node dist/index.js