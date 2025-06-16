# 🔔 Smart Tasks 主動提醒系統

## 🎯 功能概述

Smart Tasks MCP 工具現在支援完整的主動提醒功能，包括：

- **⏰ 即時提醒** - 任務即將到期時自動提醒
- **📅 定時提醒** - 每日固定時間提醒當日任務
- **⚠️ 逾期提醒** - 逾期任務自動警告
- **🔄 重複提醒** - 每日/每週重複任務提醒
- **🔔 桌面通知** - Linux 系統原生通知
- **🎵 聲音提醒** - 可選的聲音通知

## 🚀 快速啟動

### 1. 啟動提醒服務（背景運行）
```bash
./start-reminder.sh
```

### 2. 測試提醒功能
```bash
./start-reminder.sh --test
```

### 3. 手動檢查提醒
```bash
./start-reminder.sh --check
```

## ⚙️ 提醒配置

### 通過 MCP 工具配置

#### 查看當前配置
```json
// 使用 get_reminder_config 工具
{}
```

#### 更新配置
```json
// 使用 update_reminder_config 工具
{
  "config": {
    "enabled": true,              // 啟用提醒
    "checkInterval": 5,           // 檢查間隔（分鐘）
    "reminderTimes": ["09:00", "18:00"], // 定時提醒時間
    "advanceReminder": 1,         // 提前提醒時間（小時）
    "overdueReminder": true,      // 啟用逾期提醒
    "soundEnabled": true          // 啟用聲音提醒
  }
}
```

### 預設配置
```json
{
  "enabled": true,
  "checkInterval": 5,           // 每5分鐘檢查一次
  "reminderTimes": ["09:00", "18:00"], // 早上9點和晚上6點提醒
  "advanceReminder": 1,         // 提前1小時提醒即將到期任務
  "overdueReminder": true,      // 提醒逾期任務
  "soundEnabled": true          // 播放提醒聲音
}
```

## 🔧 提醒類型

### 1. ⏰ 即將到期提醒
- **觸發條件**：任務在設定時間內即將到期
- **提醒時間**：預設提前1小時
- **緊急程度**：高優先級任務使用 `critical` 通知

### 2. 📅 定時提醒
- **觸發條件**：到達設定的提醒時間
- **預設時間**：09:00 和 18:00
- **內容**：當日所有未完成任務

### 3. ⚠️ 逾期提醒
- **觸發條件**：任務已過期且未完成
- **緊急程度**：`critical` 通知
- **頻率**：每次檢查時提醒

### 4. 🔄 重複任務提醒
- **每日任務**：每天提醒
- **每週任務**：每週同一天提醒

## 🖥️ 系統級管理

### 設置為系統服務（可選）

1. **安裝服務**
```bash
sudo cp smart-tasks-reminder.service /etc/systemd/system/
sudo systemctl daemon-reload
```

2. **啟動服務**
```bash
sudo systemctl enable smart-tasks-reminder@ubuntu24
sudo systemctl start smart-tasks-reminder@ubuntu24
```

3. **檢查狀態**
```bash
sudo systemctl status smart-tasks-reminder@ubuntu24
```

4. **查看日誌**
```bash
sudo journalctl -u smart-tasks-reminder@ubuntu24 -f
```

## 📱 通知效果

### 🐧 Linux 桌面通知
- **工具**：使用 `notify-send` 命令
- **圖標**：appointment-soon
- **應用名**：Smart Tasks
- **緊急程度**：normal / critical

### 🪟 WSL Windows 通知
- **自動檢測**：系統自動檢測 WSL 環境
- **MessageBox**：兼容性最佳的彈出對話框
- **Toast通知**：Windows 10/11 現代化通知 (實驗性)
- **跨平台**：WSL 中調用 Windows 原生通知系統

### 🎵 聲音提醒
- **Linux**：系統預設提醒聲
- **WSL**：建議關閉聲音 (避免路徑問題)
- **可關閉**：通過配置 `soundEnabled: false`

## 🧪 測試功能

### 可用的 MCP 工具

1. **test_notification** - 測試桌面通知
2. **manual_reminder_check** - 手動觸發提醒檢查
3. **get_reminder_config** - 查看提醒配置
4. **update_reminder_config** - 更新提醒配置

### 測試方式

1. **測試通知**
```bash
# 通過 MCP 工具
use tool: test_notification

# 或直接命令行
./start-reminder.sh --test
```

2. **手動檢查**
```bash
# 通過 MCP 工具
use tool: manual_reminder_check

# 或直接命令行
./start-reminder.sh --check
```

## 📁 配置文件

### 位置
```
/home/ubuntu24/corsor/mcpTool/smart-tasks-mcp/dist/reminder-config.json
```

### 格式
```json
{
  "enabled": true,
  "checkInterval": 5,
  "reminderTimes": ["09:00", "18:00"],
  "advanceReminder": 1,
  "overdueReminder": true,
  "soundEnabled": true
}
```

## 💡 使用建議

1. **初次使用**：先用 `test_notification` 確認系統通知正常工作
2. **時間設定**：根據個人作息調整 `reminderTimes`
3. **檢查頻率**：根據需要調整 `checkInterval`，平衡及時性和系統資源
4. **緊急任務**：高優先級任務會使用更醒目的通知
5. **背景運行**：建議設置為系統服務以持續運行

## 🪟 WSL 環境特別說明

### 自動環境檢測
系統會自動檢測 WSL 環境並使用 Windows 原生通知：

```bash
# WSL 環境檢測日誌示例
🔍 檢測環境: Linux version 5.15.167.4-microsoft-standard-WSL2 ...
🔍 WSL檢測結果: true
🪟 WSL環境檢測到，使用Windows通知
```

### WSL 專用測試
```bash
# 測試 PowerShell 可用性
powershell.exe -Command "echo 'PowerShell works in WSL'"

# 手動測試 Windows 通知
powershell.exe -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('Test', 'Smart Tasks', 'OK', 'Information')"
```

### WSL 建議配置
```json
{
  "enabled": true,
  "checkInterval": 10,          // 較長間隔，減少通知頻率
  "reminderTimes": ["09:00", "17:00"],
  "advanceReminder": 2,         // 提前2小時提醒
  "overdueReminder": true,
  "soundEnabled": false         // 關閉聲音避免錯誤
}
```

詳細 WSL 設置請參考：[WSL-SETUP.md](WSL-SETUP.md)

## 🔍 故障排除

### 通知不顯示

#### Linux 環境
1. 檢查是否安裝了 `notify-send`：`which notify-send`
2. 測試系統通知：`notify-send "測試" "Hello World"`
3. 檢查桌面環境是否支援通知

#### WSL 環境
1. 檢查 PowerShell 可用性：`powershell.exe -Command "echo 'test'"`
2. 檢查 Windows Forms：`powershell.exe -Command "Add-Type -AssemblyName System.Windows.Forms; echo 'OK'"`
3. 測試手動通知：參考上方 WSL 專用測試

### 服務無法啟動
1. 檢查依賴是否安裝：`npm install`
2. 檢查編譯是否成功：`npm run build`
3. 檢查文件權限：`chmod +x start-reminder.sh`

### 配置不生效
1. 檢查配置文件格式：`cat dist/reminder-config.json`
2. 重啟提醒服務以應用新配置
3. 使用 MCP 工具更新配置確保格式正確

### WSL 特定問題
1. **中文亂碼**：設置 `export LANG=zh_TW.UTF-8`
2. **執行策略**：在 Windows PowerShell 中運行 `Set-ExecutionPolicy RemoteSigned`
3. **權限問題**：確保可以執行 `powershell.exe`

---

**🎉 主動提醒系統現已完全整合到 Smart Tasks MCP 工具中！**