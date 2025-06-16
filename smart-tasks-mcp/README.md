# 📝 智能代辦事項管理與主動提醒 MCP 工具

> 讓 AI Agent 幫你高效管理待辦事項，主動提醒重要任務，提升生產力！

## 🎯 工具定位

專為 AI Agent 設計的代辦事項管理 MCP 工具，支援多層級分類、標籤、優先級、到期提醒與主動推播，讓任務管理更智慧、更貼心。

## ✅ 已完成功能

### 🛠️ 核心功能
- ✅ 代辦事項的新增、查詢、編輯、刪除
- ✅ 多層級分類、標籤、優先級
- ✅ 到期日、重複提醒、週期任務
- ✅ 查詢今日/本週/逾期/已完成事項
- ✅ 支援自然語言輸入（如「明天下午三點開會」自動解析）
- ✅ 任務統計與分組顯示
- ✅ 搜索功能
- ✅ **主動提醒系統**（桌面通知、定時提醒、逾期警告）

### 🔧 技術實現
- ✅ MCP 標準協議完整實現
- ✅ 本地 JSON 檔案儲存
- ✅ TypeScript + Node.js 開發
- ✅ ES Module 支援
- ✅ 完整的錯誤處理
- ✅ **跨平台支援**（Linux + WSL Windows 通知）

## 🚀 快速開始

### 1. 安裝依賴
```bash
cd smart-tasks-mcp
npm install
```

### 2. 編譯項目
```bash
npm run build
```

### 3. 配置 Cursor MCP
在 `.mcp.json` 文件中添加：
```json
{
  "mcpServers": {
    "smart-tasks": {
      "command": "/home/ubuntu24/corsor/mcpTool/smart-tasks-mcp/start.sh"
    }
  }
}
```

### 4. 重啟 Cursor
配置更新後需重啟 Cursor 以載入新的 MCP 工具。

## 📋 可用 MCP 工具

### 1. add_task - 新增代辦事項
```json
{
  "title": "買牛奶",
  "dueDate": "2024-07-01T15:00:00Z",
  "tags": ["生活", "購物"],
  "priority": 1,
  "repeat": "none",
  "note": "記得買低脂牛奶"
}
```

### 2. add_task_natural - 自然語言新增任務
```json
{
  "input": "明天下午3點開會 #工作 重要"
}
```
支援的自然語言格式：
- `明天下午3點開會` → 自動解析時間
- `#工作 #重要` → 自動提取標籤  
- `重要` → 自動設定優先級
- `每天運動` → 自動設定重複

### 3. list_tasks - 查詢代辦事項
```json
{
  "filter": "today",  // today|week|overdue|completed|all
  "tags": ["工作"],    // 可選，按標籤過濾
  "priority": 1        // 可選，按優先級過濾
}
```

### 4. list_tasks_grouped - 分組顯示任務
```json
{
  "showCompleted": false  // 是否顯示已完成任務
}
```
自動按時間分組：逾期、今天、明天、本週、下週、未來、無期限

### 5. search_tasks - 搜索任務
```json
{
  "query": "開會"  // 搜索標題、備註、標籤
}
```

### 6. update_task - 更新任務
```json
{
  "id": "task-1234567890-abc123def",
  "fields": {
    "title": "新標題",
    "completed": true,
    "priority": 2
  }
}
```

### 7. complete_task - 完成任務
```json
{
  "id": "task-1234567890-abc123def"
}
```

### 8. delete_task - 刪除任務
```json
{
  "id": "task-1234567890-abc123def"
}
```

### 9. get_reminders - 查詢提醒
```json
{
  "date": "2024-07-01"  // 可選，預設今日
}
```

### 10. get_stats - 查詢統計
```json
{}
```
返回總任務數、已完成、今日到期、已逾期等統計信息。

### 11. get_reminder_config - 查詢提醒配置
```json
{}
```

### 12. update_reminder_config - 更新提醒配置
```json
{
  "config": {
    "enabled": true,
    "checkInterval": 5,
    "reminderTimes": ["09:00", "18:00"],
    "advanceReminder": 1,
    "overdueReminder": true,
    "soundEnabled": true
  }
}
```

### 13. test_notification - 測試桌面通知
```json
{}
```

### 14. manual_reminder_check - 手動觸發提醒檢查
```json
{}
```

## 🎨 功能特色

### 自然語言解析
支援以下格式的自然語言輸入：
- **時間解析**：今天、明天、後天、下週、3天後、下午2點
- **標籤提取**：#工作 #重要 #購物
- **優先級識別**：重要、緊急、高 → 高優先級
- **重複設定**：每天、每週、daily、weekly

### 智能分組
任務自動按時間分組顯示：
- 🚨 **逾期**：已過期的未完成任務
- 📅 **今天**：今日到期的任務
- ⏭️ **明天**：明日到期的任務  
- 📆 **本週**：本週內到期的任務
- 🗓️ **下週**：下週到期的任務
- 🔮 **未來**：更遠期的任務
- ♾️ **無期限**：沒有設定到期日的任務

### 視覺化顯示
- ✅/⏳ 完成狀態指示
- 🔴/🟡/🟢 優先級顏色標示
- ⚠️ 逾期警告
- 📅 清晰的日期時間格式

### 🔔 主動提醒系統
- **即時提醒**：任務即將到期時自動桌面通知
- **定時提醒**：每日固定時間（09:00, 18:00）提醒當日任務
- **逾期警告**：逾期任務自動發送緊急通知
- **重複任務**：每日/每週重複任務自動提醒
- **聲音提醒**：可選的系統聲音通知
- **靈活配置**：提醒間隔、時間、類型完全可自定義
- **🪟 WSL 支援**：自動檢測 WSL 環境，使用 Windows 原生通知

## 🧪 測試

運行測試腳本驗證MCP工具：
```bash
node test.js
```

## 📁 檔案結構

```
smart-tasks-mcp/
├── src/
│   ├── index.ts      # 主要MCP服務器
│   └── utils.ts      # 工具函數
├── dist/             # 編譯輸出
├── start.sh          # 啟動腳本
├── test.js           # 測試腳本
├── package.json      # 項目配置
└── README.md         # 使用說明
```

## 🚀 未來擴充方向
- 🌐 多人協作、任務指派
- 📅 行事曆整合（Google/Outlook）
- 🤖 智能推薦（根據習慣自動排序/提醒）
- 🎤 語音輸入、手機推播
- 🔗 任務依賴/子任務
- 📝 與知識卡片/筆記系統串接
- 🔔 桌面通知和系統整合
- ☁️ 雲端同步功能

## 🔔 主動提醒系統

### 快速啟動提醒服務
```bash
# 啟動背景提醒服務
./start-reminder.sh

# 測試提醒功能
./start-reminder.sh --test

# 手動檢查提醒
./start-reminder.sh --check
```

### 提醒配置
- **檢查間隔**：預設每5分鐘檢查一次
- **定時提醒**：每日09:00和18:00提醒當日任務
- **提前提醒**：任務到期前1小時提醒
- **逾期提醒**：自動提醒逾期未完成任務
- **桌面通知**：使用Linux系統原生通知
- **聲音提醒**：可選的系統聲音

詳細使用說明請參考 [REMINDER.md](REMINDER.md)

### 🪟 WSL 環境專用
如果你使用 WSL (Windows Subsystem for Linux)：

1. **自動檢測**：系統會自動檢測 WSL 環境
2. **Windows 通知**：自動使用 Windows 原生通知系統
3. **無需額外設置**：開箱即用的 Windows 桌面通知

WSL 專用設置指南：[WSL-SETUP.md](WSL-SETUP.md)

## 💡 使用技巧

1. **快速添加任務**：使用 `add_task_natural` 以自然語言快速創建任務
2. **分組查看**：使用 `list_tasks_grouped` 獲得更清晰的任務概覽
3. **搜索查找**：用 `search_tasks` 快速找到特定任務
4. **統計監控**：定期使用 `get_stats` 了解任務完成情況
5. **提醒管理**：用 `get_reminders` 查看當日重要事項
6. **主動提醒**：啟動 `start-reminder.sh` 獲得自動桌面通知



## 📁 任務存放位置

  任務事項存放在：
  /home/ubuntu24/corsor/mcpTool/smart-tasks-mcp/dist/tasks.json

  📋 存放格式

  任務以JSON格式存放，每個任務包含以下欄位：

  {
    "id": "task-1750091523792-7q19hpow1",     // 唯一ID
    "title": "測試任務",                       // 任務標題
    "dueDate": "2024-06-17T15:00:00Z",       // 到期日期（ISO 8601格式）
    "tags": ["測試"],                         // 標籤陣列
    "priority": 1,                           // 優先級（1=高，2=中，3=低）
    "repeat": "none",                        // 重複設定
    "note": "備註內容",                       // 備註（可選）
    "completed": false,                      // 完成狀態
    "createdAt": "2025-06-16T16:32:03.792Z", // 創建時間
    "updatedAt": "2025-06-16T16:32:03.792Z"  // 更新時間
  }

  🔧 存放邏輯

  - 自動創建：首次添加任務時自動創建文件
  - 即時保存：每次增刪改操作都會立即保存到文件
  - 格式化存放：使用縮排格式，便於閱讀和手動編輯
  - 備份建議：重要任務建議定期備份此文件

  💡 手動管理

  你也可以直接編輯這個JSON文件來：
  - 批量導入任務
  - 手動備份/恢復任務
  - 修改任務屬性

  但建議通過MCP工具操作以確保數據格式正確。
---

**🎉 部署狀態：✅ 已完成並可在 Cursor 中使用**

*開發完成：2024年6月 | 已集成到 Cursor MCP* 