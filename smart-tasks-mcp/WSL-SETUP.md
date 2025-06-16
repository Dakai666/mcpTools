# 🪟 WSL 環境使用指南

## 🎯 WSL 環境說明

在 WSL (Windows Subsystem for Linux) 環境中，Smart Tasks MCP 工具已經自動優化以支援 Windows 桌面通知。

## ✅ 自動環境檢測

系統會自動檢測 WSL 環境並使用適當的通知方式：

- **🪟 WSL環境**：使用 Windows 原生通知 (MessageBox/Toast)
- **🐧 原生Linux**：使用 Linux 桌面通知 (notify-send)

## 🔔 WSL 通知類型

### 1. Windows MessageBox 通知
- **優點**：最兼容，所有 Windows 版本都支援
- **特點**：彈出對話框，需要用戶點擊確認
- **使用場景**：重要提醒、緊急通知

### 2. Windows Toast 通知 (實驗性)
- **優點**：現代化，不阻斷工作流程
- **特點**：右下角彈出，自動消失
- **要求**：Windows 10/11，PowerShell 5.0+

## 🚀 快速測試

### 測試通知功能
```bash
# 方法1: 通過 MCP 工具
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"test_notification","arguments":{}}}' | node dist/index.js

# 方法2: 直接使用提醒服務
./start-reminder.sh --test
```

### 手動測試 PowerShell 通知
```bash
# 測試 MessageBox
powershell.exe -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('Hello from WSL!', 'Test', 'OK', 'Information')"

# 測試 Toast 通知 (需要 Windows 10/11)
powershell.exe -File scripts/windows-notify.ps1 -Title "測試" -Message "來自 WSL 的通知"
```

## ⚙️ WSL 專用配置

WSL 環境下的提醒配置建議：

```json
{
  "enabled": true,
  "checkInterval": 10,          // 稍長的檢查間隔，減少 Windows 通知頻率
  "reminderTimes": ["09:00", "17:00"], // 工作時間提醒
  "advanceReminder": 2,         // 提前2小時提醒，給更多準備時間
  "overdueReminder": true,
  "soundEnabled": false         // WSL 中關閉聲音，避免錯誤
}
```

## 🔧 故障排除

### 通知不顯示
1. **檢查 PowerShell 可用性**
```bash
powershell.exe -Command "echo 'PowerShell works'"
```

2. **檢查 Windows Forms 支援**
```bash
powershell.exe -Command "Add-Type -AssemblyName System.Windows.Forms; echo 'Forms available'"
```

3. **檢查執行策略**
```bash
powershell.exe -Command "Get-ExecutionPolicy"
```

### 中文字符問題
如果通知中的中文顯示為亂碼，嘗試：

```bash
# 設置 WSL 編碼
export LANG=zh_TW.UTF-8
export LC_ALL=zh_TW.UTF-8
```

### 權限問題
如果 PowerShell 執行被阻止：

1. **在 Windows PowerShell (管理員) 中運行**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

2. **或使用 Bypass 參數** (已內建在腳本中)
```bash
powershell.exe -ExecutionPolicy Bypass -Command "..."
```

## 📋 WSL 環境檢測日誌

當運行測試時，會看到類似輸出：
```
🔍 檢測環境: Linux version 5.15.167.4-microsoft-standard-WSL2 ...
🔍 WSL檢測結果: true
🪟 WSL環境檢測到，使用Windows通知
```

## 🎨 進階配置

### 自定義通知腳本
你可以修改 `scripts/windows-notify.ps1` 來自定義通知樣式：

```powershell
# 添加圖標
$xml.toast.visual.binding.image.src = "file:///path/to/icon.png"

# 設置持續時間
$xml.toast.SetAttribute("duration", "long")

# 添加按鈕
$actions = $xml.CreateElement("actions")
$xml.toast.AppendChild($actions)
```

### 系統服務配置
在 WSL 中運行為背景服務：

1. **創建 WSL 啟動腳本**
```bash
# 在 Windows 啟動文件夾創建 start-smart-tasks.bat
cd /d C:\Users\%USERNAME%\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup
echo wsl -d Ubuntu -u ubuntu24 /home/ubuntu24/corsor/mcpTool/smart-tasks-mcp/start-reminder.sh > start-smart-tasks.bat
```

2. **設置開機自啟**
   - 將 `start-smart-tasks.bat` 放入 Windows 啟動文件夾
   - 或使用 Windows 工作排程器

## 💡 最佳實踐

1. **測試優先**：先用 `test_notification` 確認通知正常
2. **適度提醒**：WSL 環境建議較長的檢查間隔
3. **備用方案**：如果通知失敗，檢查控制台輸出
4. **編碼注意**：避免特殊字符可能的顯示問題
5. **性能考慮**：Windows 通知比 Linux 通知稍慢

## 🔄 更新和維護

### 更新通知腳本
```bash
# 重新編譯
npm run build

# 測試更新
./start-reminder.sh --test
```

### 清理和重置
```bash
# 清理配置
rm dist/reminder-config.json

# 重建項目
npm run build
```

---

**🎉 WSL 環境下的 Smart Tasks 通知系統已完全就緒！**

現在你可以在 WSL Ubuntu 中運行任務管理工具，並在 Windows 桌面接收通知提醒。