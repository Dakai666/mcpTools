/**
 * PDF-Parse 包裝器
 * 避免直接引用時的測試文件依賴問題
 */

export async function parsePdf(buffer: Buffer): Promise<any> {
  // 動態引入 pdf-parse 以避免模組初始化問題
  const pdfParse = await import('pdf-parse');
  const parse = pdfParse.default || pdfParse;
  
  return parse(buffer);
}