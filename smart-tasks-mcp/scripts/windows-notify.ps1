# Windows Toast 通知腳本
param(
    [string]$Title,
    [string]$Message
)

# 嘗試使用Windows 10/11 Toast通知
try {
    Add-Type -AssemblyName System.Windows.Forms
    
    # 創建Toast通知
    $null = [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]
    $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
    $xml = [xml] $template.GetXml()
    
    # 設置標題和內容
    $xml.toast.visual.binding.text[0].AppendChild($xml.CreateTextNode($Title)) | Out-Null
    $xml.toast.visual.binding.text[1].AppendChild($xml.CreateTextNode($Message)) | Out-Null
    
    # 顯示通知
    $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
    $notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Smart Tasks MCP')
    $notifier.Show($toast)
    
    Write-Host "✅ Toast通知已發送"
} catch {
    # 如果Toast失敗，使用MessageBox作為備用
    try {
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.MessageBox]::Show($Message, "Smart Tasks: $Title", 'OK', 'Information')
        Write-Host "✅ MessageBox通知已發送"
    } catch {
        # 最後的備用方案 - 在控制台顯示
        Write-Host "📢 $Title"
        Write-Host "   $Message"
    }
}