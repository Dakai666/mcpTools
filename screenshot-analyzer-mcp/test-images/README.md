# 測試圖片目錄

請將要測試的截圖檔案放在這個目錄中。

支援的格式：
- PNG
- JPEG
- BMP
- TIFF

## 使用範例

```bash
# 編譯專案
npm run build

# 分析截圖
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"analyze_screenshot","arguments":{"imagePath":"./test-images/screenshot.png"}}}' | node dist/index.js

# 僅提取文字
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"extract_text_only","arguments":{"imagePath":"./test-images/screenshot.png"}}}' | node dist/index.js
```
