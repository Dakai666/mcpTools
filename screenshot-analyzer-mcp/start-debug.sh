#!/bin/bash

# 設置工作目錄
cd "$(dirname "$0")"

# 記錄啟動信息
echo "Starting Screenshot Analyzer MCP server..." >&2
echo "Working directory: $(pwd)" >&2
echo "Node version: $(node --version)" >&2

# 檢查必要檔案
if [ ! -f "dist/index.js" ]; then
    echo "Error: dist/index.js not found. Run 'npm run build' first." >&2
    exit 1
fi

# 啟動服務
exec node dist/index.js