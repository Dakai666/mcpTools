#!/bin/bash
cd "$(dirname "$0")"

# 檢查並安裝依賴
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..." >&2
    npm install >&2
fi

# 檢查並編譯項目
if [ ! -d "dist" ] || [ "src/reminder.ts" -nt "dist/reminder.js" ]; then
    echo "Building project..." >&2
    npm run build >&2
fi

# 啟動提醒服務
echo "🔔 Starting Smart Tasks Reminder Service..."
node dist/reminder.js "$@"