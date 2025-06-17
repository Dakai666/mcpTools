export class ContentAnalyzer {
    analyzeContent(ocrResult) {
        const textBlocks = this.extractTextBlocks(ocrResult);
        const possibleTables = this.detectTables(ocrResult);
        const detectedLanguages = this.detectLanguages(ocrResult.text);
        const summary = this.generateSummary(ocrResult.text, textBlocks);
        return {
            textBlocks,
            possibleTables,
            detectedLanguages,
            summary
        };
    }
    extractTextBlocks(ocrResult) {
        const blocks = [];
        ocrResult.blocks.forEach(block => {
            const textType = this.classifyTextType(block.text, block.bbox);
            blocks.push({
                type: textType,
                text: block.text.trim(),
                bbox: block.bbox,
                confidence: block.confidence
            });
        });
        return blocks.sort((a, b) => a.bbox.y0 - b.bbox.y0); // 按 Y 軸位置排序
    }
    classifyTextType(text, bbox) {
        const cleanText = text.trim();
        // 標題判斷：文字較少、位置靠上、可能有大寫
        if (cleanText.length < 100 && cleanText.length > 5) {
            const hasCapitalization = /^[A-Z]/.test(cleanText) || cleanText === cleanText.toUpperCase();
            const wordsCount = cleanText.split(/\s+/).length;
            if (wordsCount <= 10 && hasCapitalization) {
                return 'title';
            }
        }
        // 程式碼判斷：包含特殊符號、括號、分號等
        const codePatterns = [
            /[{}();]/g, // 程式碼符號
            /\b(function|class|import|export|const|let|var)\b/g, // JS 關鍵字
            /\b(def|class|import|from)\b/g, // Python 關鍵字
            /[<>]/g, // HTML 標籤
            /\w+\s*=\s*\w+/g // 賦值語句
        ];
        const codeMatches = codePatterns.reduce((count, pattern) => {
            return count + (cleanText.match(pattern) || []).length;
        }, 0);
        if (codeMatches > 3 || cleanText.includes('```')) {
            return 'code';
        }
        // 列表判斷：開頭有數字、項目符號等
        const listPatterns = [
            /^\d+\./, // 數字列表
            /^[-•*]\s/, // 項目符號
            /^\w+[.)]\s/ // 字母列表
        ];
        const lines = cleanText.split('\n');
        const listLines = lines.filter(line => listPatterns.some(pattern => pattern.test(line.trim())));
        if (listLines.length > 1 || (listLines.length === 1 && lines.length === 1)) {
            return 'list';
        }
        // 段落判斷：較長的文字內容
        if (cleanText.length > 50) {
            return 'paragraph';
        }
        return 'other';
    }
    detectTables(ocrResult) {
        const tables = [];
        // 基於文字位置的表格檢測
        const sortedWords = [...ocrResult.words].sort((a, b) => {
            if (Math.abs(a.bbox.y0 - b.bbox.y0) < 10) {
                return a.bbox.x0 - b.bbox.x0; // 同一行按 X 排序
            }
            return a.bbox.y0 - b.bbox.y0; // 不同行按 Y 排序
        });
        // 分組成行
        const rows = [];
        let currentRow = [];
        let lastY = -1;
        sortedWords.forEach(word => {
            if (lastY === -1 || Math.abs(word.bbox.y0 - lastY) < 15) {
                currentRow.push(word);
            }
            else {
                if (currentRow.length > 0) {
                    rows.push([...currentRow]);
                }
                currentRow = [word];
            }
            lastY = word.bbox.y0;
        });
        if (currentRow.length > 0) {
            rows.push(currentRow);
        }
        // 檢測表格結構
        if (rows.length >= 3) { // 至少3行才可能是表格
            const columnPositions = this.detectColumnPositions(rows);
            if (columnPositions.length >= 2) { // 至少2列
                const tableData = this.extractTableData(rows, columnPositions);
                if (tableData.length > 0) {
                    const tableBbox = this.calculateTableBounds(rows);
                    tables.push({
                        rows: tableData.length,
                        columns: columnPositions.length,
                        bbox: tableBbox,
                        cells: tableData
                    });
                }
            }
        }
        return tables;
    }
    detectColumnPositions(rows) {
        const positions = {};
        rows.forEach(row => {
            row.forEach(word => {
                const x = Math.round(word.bbox.x0 / 10) * 10; // 四捨五入到最近的10
                positions[x] = (positions[x] || 0) + 1;
            });
        });
        // 找出出現頻率高的 X 位置作為列位置
        const sortedPositions = Object.entries(positions)
            .filter(([_, count]) => count >= Math.max(2, Math.floor(rows.length * 0.3)))
            .map(([pos, _]) => parseInt(pos))
            .sort((a, b) => a - b);
        return sortedPositions;
    }
    extractTableData(rows, columnPositions) {
        const tableData = [];
        rows.forEach(row => {
            const rowData = [];
            columnPositions.forEach((colPos, colIndex) => {
                const nextColPos = columnPositions[colIndex + 1];
                // 找到屬於這個列範圍的文字
                const cellWords = row.filter(word => {
                    const wordX = word.bbox.x0;
                    return wordX >= colPos - 20 &&
                        (!nextColPos || wordX < nextColPos - 20);
                });
                const cellText = cellWords
                    .sort((a, b) => a.bbox.x0 - b.bbox.x0)
                    .map(word => word.text)
                    .join(' ')
                    .trim();
                if (cellWords.length > 0) {
                    const cellBbox = this.calculateBounds(cellWords);
                    rowData.push({
                        text: cellText,
                        bbox: cellBbox,
                        rowspan: 1,
                        colspan: 1
                    });
                }
                else {
                    rowData.push({
                        text: '',
                        bbox: { x0: colPos, y0: 0, x1: colPos, y1: 0 },
                        rowspan: 1,
                        colspan: 1
                    });
                }
            });
            if (rowData.some(cell => cell.text.trim())) {
                tableData.push(rowData);
            }
        });
        return tableData;
    }
    calculateTableBounds(rows) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        rows.forEach(row => {
            row.forEach(word => {
                minX = Math.min(minX, word.bbox.x0);
                minY = Math.min(minY, word.bbox.y0);
                maxX = Math.max(maxX, word.bbox.x1);
                maxY = Math.max(maxY, word.bbox.y1);
            });
        });
        return { x0: minX, y0: minY, x1: maxX, y1: maxY };
    }
    calculateBounds(words) {
        if (words.length === 0) {
            return { x0: 0, y0: 0, x1: 0, y1: 0 };
        }
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        words.forEach(word => {
            minX = Math.min(minX, word.bbox.x0);
            minY = Math.min(minY, word.bbox.y0);
            maxX = Math.max(maxX, word.bbox.x1);
            maxY = Math.max(maxY, word.bbox.y1);
        });
        return { x0: minX, y0: minY, x1: maxX, y1: maxY };
    }
    detectLanguages(text) {
        const languages = [];
        // 簡單的語言檢測
        const chinesePattern = /[\u4e00-\u9fff]/;
        const englishPattern = /[a-zA-Z]/;
        const japanesePattern = /[\u3040-\u309f\u30a0-\u30ff]/;
        const koreanPattern = /[\uac00-\ud7af]/;
        if (chinesePattern.test(text)) {
            languages.push('Chinese');
        }
        if (englishPattern.test(text)) {
            languages.push('English');
        }
        if (japanesePattern.test(text)) {
            languages.push('Japanese');
        }
        if (koreanPattern.test(text)) {
            languages.push('Korean');
        }
        return languages.length > 0 ? languages : ['Unknown'];
    }
    generateSummary(text, textBlocks) {
        const cleanText = text.replace(/\s+/g, ' ').trim();
        if (cleanText.length === 0) {
            return 'No readable text found in the image.';
        }
        const titles = textBlocks.filter(block => block.type === 'title');
        const paragraphs = textBlocks.filter(block => block.type === 'paragraph');
        const lists = textBlocks.filter(block => block.type === 'list');
        const code = textBlocks.filter(block => block.type === 'code');
        let summary = `Detected ${cleanText.length} characters of text.`;
        if (titles.length > 0) {
            summary += ` Found ${titles.length} title(s).`;
        }
        if (paragraphs.length > 0) {
            summary += ` Contains ${paragraphs.length} paragraph(s).`;
        }
        if (lists.length > 0) {
            summary += ` Includes ${lists.length} list(s).`;
        }
        if (code.length > 0) {
            summary += ` Contains ${code.length} code block(s).`;
        }
        // 提取主要標題作為摘要
        if (titles.length > 0) {
            const mainTitle = titles[0].text.substring(0, 100);
            summary += ` Main content: "${mainTitle}${mainTitle.length === 100 ? '...' : ''}"`;
        }
        else if (paragraphs.length > 0) {
            const firstParagraph = paragraphs[0].text.substring(0, 100);
            summary += ` Preview: "${firstParagraph}${firstParagraph.length === 100 ? '...' : ''}"`;
        }
        return summary;
    }
}
//# sourceMappingURL=ContentAnalyzer.js.map