# Contextual File Organizer MCP Tool

智能文件管理 MCP 工具，提供內容分析、智能分類、目錄組織和重複文件檢測功能。

## 功能特色

### 🔍 智能文件分析
- 支援多種文件格式（PDF、Word、圖片、程式碼等）
- 內容關鍵字提取和分析
- 文件大小、創建時間統計
- 編程語言識別

### 🏷️ 智能分類系統
- 基於內容的自動分類
- 支援自定義分類規則
- 多維度匹配（副檔名、關鍵字、路徑模式、內容模式）
- 高準確率的分類建議

### 📁 目錄結構組織
- 自動生成邏輯目錄結構
- 支援預覽模式（Dry Run）
- 衝突檔案處理（重新命名、跳過、覆蓋）
- 自動備份功能

### 🔄 重複文件檢測
- 基於內容哈希的精確檢測
- 支援 MD5 和 SHA256 算法
- 智能清理建議
- 空間節省統計

## 🚀 安裝與配置

### 1. 安裝依賴
```bash
npm install
npm run build
```

### 2. MCP 工具配置

#### 在 Cursor 中使用（推薦）
編輯 `~/.cursor/mcp.json`：
```json
{
  "mcpServers": {
    "contextual-file-organizer": {
      "command": "/home/ubuntu24/corsor/mcpTool/contextual-file-organizer/start.sh"
    }
  }
}
```

#### 在 Claude Desktop 中使用
配置文件位置：
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`  
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "contextual-file-organizer": {
      "command": "node",
      "args": ["/absolute/path/to/mcpTool/dist/index.js"]
    }
  }
}
```

### 3. 使用方式

#### 🔄 本機運行機制
- **自動啟動**: Cursor/Claude 自動管理 MCP 服務器進程
- **本機執行**: 直接運行本地檔案，無需複製或部署
- **即時更新**: 修改代碼後 `npm run build` + 重啟編輯器即可
- **資源存取**: 可直接操作本機檔案系統

#### ✅ 驗證安裝
1. 重啟 Cursor 或 Claude Desktop
2. 檢查 MCP Tools 面板顯示工具數量
3. 測試指令：
```
請使用 analyze_files 工具分析 /home/ubuntu24/corsor/mcpTool 目錄
```
  
### 可用工具

#### 1. analyze_files - 分析文件
```javascript
{
  "path": "/path/to/directory",
  "recursive": true,
  "includeHidden": false
}
```

#### 2. categorize_files - 分類文件
```javascript
{
  "path": "/path/to/directory",
  "categories": ["Reports", "Notes", "Images"] // 可選
}
```

#### 3. organize_structure - 組織目錄結構
```javascript
{
  "sourcePath": "/path/to/source",
  "targetPath": "/path/to/target",
  "dryRun": false,
  "createBackup": true
}
```

#### 4. detect_duplicates - 檢測重複文件
```javascript
{
  "path": "/path/to/directory",
  "recursive": true,
  "algorithm": "sha256"
}
```

#### 5. generate_report - 生成報告
```javascript
{
  "path": "/path/to/directory",
  "format": "markdown",
  "includePreview": false
}
```

## 分類規則

### 預設分類
- **Reports** - 報告文件（PDF、Word、PPT）
- **Notes** - 筆記文件（Markdown、TXT）
- **Contracts_Legal** - 合約法律文件
- **Images** - 圖片文件
- **Videos** - 影片文件
- **Audio** - 音頻文件
- **Source_Code** - 程式碼文件
- **Configuration** - 配置文件
- **Logs** - 日誌文件
- **Spreadsheets** - 試算表文件
- **Databases** - 資料庫文件
- **Archives** - 壓縮檔案
- **Financial** - 財務文件
- **Temporary** - 暫存文件

### 自定義分類
可以通過 `FileCategorizer.addCustomCategory()` 添加自定義分類規則。

## 技術特色

### 多維度分析
- 檔案副檔名匹配
- 檔案名關鍵字分析
- 路徑模式識別
- 內容模式匹配
- 優先級權重計算

### 智能建議
- 未分類文件處理建議
- 重複文件清理建議
- 目錄結構優化建議

### 安全性
- 自動備份功能
- 預覽模式（Dry Run）
- 錯誤處理和回滾
- 檔案衝突解決

## 開發

### 項目結構
```
src/
├── index.ts              # 主要 MCP 服務器
├── services/
│   ├── FileAnalyzer.ts   # 文件分析服務
│   ├── FileCategorizer.ts # 文件分類服務
│   ├── DirectoryOrganizer.ts # 目錄組織服務
│   └── DuplicateDetector.ts  # 重複檢測服務
```

### 運行開發環境
```bash
npm run dev
```

### 構建
```bash
npm run build
```

## 🎉 項目里程碑

**✅ 第一個 MCP 工具開發完成！**

這是一個從零開始設計和實現的智能文件管理 MCP 工具，具備：
- 🧠 **智能分析** - 多格式文件內容理解
- 🏷️ **自動分類** - 15+ 預設分類規則
- 📁 **結構組織** - 自動生成邏輯目錄
- 🔄 **重複檢測** - 精確內容比對
- 🔧 **即插即用** - 本機運行，零部署

### 技術成就
- ✨ 完整的 TypeScript MCP 服務器實現
- 🎯 多維度文件分析與分類算法
- 🛡️ 安全的文件操作與備份機制
- 📊 智能報告生成與建議系統
- 🚀 優雅的本機運行架構

**真正實現了「人機雙贏」的文件管理體驗！**

---

## 📜 授權
MIT License

*開發時間：2024年6月 | 使用 Claude Code 協助開發*