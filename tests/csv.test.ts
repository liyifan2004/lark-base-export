import { describe, expect, it } from 'vitest';
import { buildCsv, buildCsvWithBom, escapeCsvCell, formatBytes, makeCsvFileName } from '../src/core/csv';

describe('CSV 转义', () => {
  it('普通文本不加引号', () => {
    expect(escapeCsvCell('hello')).toBe('hello');
  });
  it('含逗号整体加引号', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
  });
  it('内部双引号转义为两个', () => {
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
  });
  it('含换行整体加引号', () => {
    expect(escapeCsvCell('a\nb')).toBe('"a\nb"');
    expect(escapeCsvCell('a\r\nb')).toBe('"a\r\nb"');
  });
});

describe('CSV 组装', () => {
  it('表头 + 数据行，CRLF 分行', () => {
    const csv = buildCsv(['名称', '链接'], [['我的主页 https://example.com', 'x']]);
    expect(csv).toBe('名称,链接\r\n我的主页 https://example.com,x');
  });
  it('BOM 版本以 \\uFEFF 开头（Excel 中文不乱码）', () => {
    const csv = buildCsvWithBom(['名称'], [['中文']]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toBe('\uFEFF名称\r\n中文');
  });
});

describe('下载文件名', () => {
  it('格式为 {表名}_{时间戳}.csv', () => {
    const d = new Date(2026, 9, 12, 21, 30, 5);
    expect(makeCsvFileName('客户表', d)).toBe('客户表_20261012-213005.csv');
  });
  it('剔除非法字符', () => {
    const d = new Date(2026, 0, 1, 0, 0, 0);
    expect(makeCsvFileName('a/b:c*d?e"f<g>h|i', d)).toBe('a_b_c_d_e_f_g_h_i_20260101-000000.csv');
  });
  it('空表名回退为 table', () => {
    const d = new Date(2026, 0, 1, 0, 0, 0);
    expect(makeCsvFileName('', d)).toBe('table_20260101-000000.csv');
  });
});

describe('formatBytes', () => {
  it('字节', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
  });
  it('KB', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });
  it('MB', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.00 MB');
  });
  it('非法输入回退 0 B', () => {
    expect(formatBytes(-1)).toBe('0 B');
    expect(formatBytes(Number.NaN)).toBe('0 B');
  });
});
