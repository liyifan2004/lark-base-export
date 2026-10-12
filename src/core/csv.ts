/**
 * CSV 组装与下载文件名生成（纯函数，可单测）。
 * 编码：UTF-8 带 BOM，保证 Excel 打开中文不乱码。
 */

/** CSV 单元格转义：含逗号/双引号/换行时整体加双引号，内部双引号转义为两个 */
export function escapeCsvCell(s: string): string {
  const str = s ?? '';
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function buildCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(','));
  return lines.join('\r\n');
}

/** UTF-8 BOM + CSV 正文，直接喂给 Blob 即可 */
export function buildCsvWithBom(headers: string[], rows: string[][]): string {
  return '\uFEFF' + buildCsv(headers, rows);
}

/** 生成下载文件名：{表名}_{时间戳}.csv，剔除 Windows 非法字符 */
export function makeCsvFileName(tableName: string, date: Date = new Date()): string {
  const safe =
    (tableName ?? '')
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80) || 'table';
  const p = (n: number) => String(n).padStart(2, '0');
  const ts =
    `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}` +
    `-${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`;
  return `${safe}_${ts}.csv`;
}
