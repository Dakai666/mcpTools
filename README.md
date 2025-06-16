# 🚀 MCP 工具包 - 智能 AI 代理工具集

> 專為 AI 代理設計的高效 MCP (Model Context Protocol) 工具包，提升 AI 助手的智能化操作能力。
> 通通都是AI幫AI做的工具，我就純vibe coding，哈哈!

## 📦 工具概覽

本工具包包含三個核心 MCP 工具，每個都針對特定場景進行深度優化：

### 🗂️ 1. 智能文件管理器 (`contextual-file-organizer`)
**一鍵整理混亂文件，AI 驅動的智能分類系統**

- **核心功能**：自動分析文件內容，智能歸類到 15+ 預設分類
- **技術特色**：支援圖片、文檔、代碼等多種格式的深度分析
- **應用場景**：桌面整理、項目文件管理、數據庫清理
- **狀態**：✅ 已完成並部署

### 📝 2. 智能任務管理器 (`smart-tasks-mcp`)
**自然語言任務管理，主動提醒不遺漏**

- **核心功能**：任務增刪改查、自然語言解析、主動桌面提醒
- **技術特色**：支援標籤分類、優先級排序、重複任務、WSL 通知
- **應用場景**：GTD 管理、項目追蹤、日程提醒
- **狀態**：✅ 已完成並部署

### 🎬 3. YouTube 內容處理器 (`youtube-content-processor`)
**快速提取 YouTube 視頻字幕，突破語言障礙**

- **核心功能**：字幕提取、多語言支援、格式轉換
- **技術特色**：基於 yt-dlp，支援自動/手動字幕，純淨無依賴
- **應用場景**：內容研究、語言學習、會議記錄
- **狀態**：✅ 已完成並部署

## 🎯 設計理念

### 為什麼選擇 MCP？
- **標準化**：遵循 Model Context Protocol 標準，確保與各種 AI 平台兼容
- **模組化**：每個工具獨立運行，按需載入，不互相干擾
- **高效性**：針對 AI 代理場景優化，提供結構化數據交互
- **擴展性**：開源架構，支援自定義擴展和二次開發

### 核心優勢
- 🧠 **AI 原生設計**：專為 AI 代理操作習慣設計的 API 接口
- ⚡ **高性能執行**：本地運行，低延遲，無網絡依賴
- 🔒 **隱私保護**：所有數據本地處理，無外部服務調用
- 🛠️ **開箱即用**：一鍵部署，無複雜配置

## 🚀 快速開始

### 環境需求
- Node.js 18.0+
- TypeScript 5.0+
- Linux/WSL/macOS

### 一鍵部署所有工具
```bash
# 克隆項目
git clone [repository-url]
cd mcpTool

# 批量編譯所有工具
for tool in contextual-file-organizer smart-tasks-mcp youtube-content-processor; do
  echo "Building $tool..."
  cd $tool && npm install && npm run build && cd ..
done
```

### 配置 Cursor MCP
在 `.mcp.json` 中添加所有工具：
```json
{
  "mcpServers": {
    "file-organizer": {
      "command": "/path/to/mcpTool/contextual-file-organizer/start.sh"
    },
    "smart-tasks": {
      "command": "/path/to/mcpTool/smart-tasks-mcp/start.sh"
    },
    "youtube-processor": {
      "command": "/path/to/mcpTool/youtube-content-processor/start.sh"
    }
  }
}
```

## 🛠️ 可用 MCP 工具 API

### 📁 文件管理器工具 (5個)
| 工具名稱 | 功能描述 | 主要參數 |
|---------|----------|----------|
| `analyze_files` | 分析目錄內容和元數據 | `directory_path` |
| `categorize_files` | 智能文件分類 | `directory_path` |
| `organize_structure` | 創建整理後的目錄結構 | `directory_path`, `output_path` |
| `detect_duplicates` | 檢測重複文件 | `directory_path` |
| `generate_report` | 生成分析報告 | `directory_path` |

### 📝 任務管理器工具 (14個)
| 工具名稱 | 功能描述 | 主要參數 |
|---------|----------|----------|
| `add_task` | 新增任務 | `title`, `dueDate`, `priority` |
| `add_task_natural` | 自然語言新增任務 | `input`（如：明天3點開會 #工作） |
| `list_tasks` | 查詢任務列表 | `filter`, `tags`, `priority` |
| `list_tasks_grouped` | 分組顯示任務 | `showCompleted` |
| `search_tasks` | 搜索任務 | `query` |
| `update_task` | 更新任務 | `id`, `fields` |
| `complete_task` | 完成任務 | `id` |
| `delete_task` | 刪除任務 | `id` |
| `get_reminders` | 查詢提醒 | `date` |
| `get_stats` | 任務統計 | - |
| `get_reminder_config` | 查詢提醒配置 | - |
| `update_reminder_config` | 更新提醒配置 | `config` |
| `test_notification` | 測試桌面通知 | - |
| `manual_reminder_check` | 手動觸發提醒 | - |

### 🎬 YouTube 處理器工具 (2個)
| 工具名稱 | 功能描述 | 主要參數 |
|---------|----------|----------|
| `get_available_captions` | 獲取可用字幕語言 | `videoUrl` |
| `extract_transcript` | 提取視頻字幕 | `videoUrl`, `languages`, `format` |

## 📊 使用統計

### 工具複雜度
- **文件管理器**：⭐⭐⭐⭐⭐ （高複雜度，多服務架構）
- **任務管理器**：⭐⭐⭐⭐ （中高複雜度，豐富功能）
- **YouTube 處理器**：⭐⭐⭐ （中等複雜度，專注功能）

### 適用場景
- 🏢 **企業辦公**：文件整理 + 任務管理
- 🎓 **學習研究**：YouTube 內容提取 + 知識管理
- 💻 **個人效率**：全套工具組合使用

## 🔧 開發與維護

### 項目結構
```
mcpTool/
├── contextual-file-organizer/    # 文件管理器
│   ├── src/services/            # 核心服務
│   ├── dist/                    # 編譯輸出
│   └── start.sh                 # 啟動腳本
├── smart-tasks-mcp/             # 任務管理器
│   ├── src/                     # 源代碼
│   ├── dist/                    # 編譯輸出
│   ├── start.sh                 # 啟動腳本
│   └── start-reminder.sh        # 提醒服務
├── youtube-content-processor/    # YouTube 處理器
│   ├── src/services/            # 服務層
│   ├── dist/                    # 編譯輸出
│   └── start.sh                 # 啟動腳本
├── doc/                         # 文檔
└── README.md                    # 本文件
```

### 技術棧
- **語言**：TypeScript + Node.js
- **架構**：MCP Protocol + ES Modules
- **存儲**：本地文件系統（JSON/文件）
- **部署**：Shell 腳本 + 系統服務

### 維護命令
```bash
# 重新編譯所有工具
make build-all

# 測試所有 MCP 工具
make test-all

# 查看運行狀態
make status

# 重啟所有服務
make restart
```

## 🎯 未來路線圖

### 短期目標 (1-2個月)
- [ ] **統一配置管理**：集中式配置文件
- [ ] **批量操作支援**：支援同時操作多個工具
- [ ] **數據同步機制**：工具間數據交互
- [ ] **性能監控**：工具使用情況統計

### 中期目標 (3-6個月)
- [ ] **Web 管理界面**：圖形化工具管理
- [ ] **雲端同步**：跨設備數據同步
- [ ] **插件市場**：社區貢獻的擴展工具
- [ ] **AI 優化建議**：基於使用習慣的智能建議

### 長期願景 (6個月+)
- [ ] **多 AI 平台支援**：支援 ChatGPT、Claude、Gemini 等
- [ ] **企業級功能**：團隊協作、權限管理
- [ ] **開源生態**：建立開發者社區
- [ ] **國際化**：多語言支援

## 🤝 貢獻指南

### 開發新工具
1. 遵循 MCP 協議標準
2. 使用 TypeScript + ES Modules
3. 提供完整的錯誤處理
4. 編寫詳細的使用文檔
5. 添加單元測試

### 提交 PR
- 代碼風格一致
- 提交信息清晰
- 測試覆蓋充分
- 文檔同步更新

## 📄 許可證

MIT License - 詳見各工具目錄下的 LICENSE 文件

## 📞 聯絡與支援

- **Issues**：[GitHub Issues](issues-link)
- **討論**：[GitHub Discussions](discussions-link)
- **文檔**：[完整文檔](docs-link)

---

**🎉 讓 AI 代理更智能，讓工作更高效！**

*最後更新：2024年6月*
