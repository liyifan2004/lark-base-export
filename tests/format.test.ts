import { describe, expect, it } from 'vitest';
import { formatCellValue, linkToText, segmentsToText } from '../src/core/format';
import { FT, type FieldMetaLike } from '../src/core/types';

const meta = (type: number): FieldMetaLike => ({ id: 'fldX', name: '字段', type });

describe('linkToText 超链接输出规则（验收硬性要求）', () => {
  it('显示文字与链接不同：输出「显示文字 空格 原始链接」', () => {
    expect(linkToText('我的主页', 'https://example.com')).toBe('我的主页 https://example.com');
  });
  it('显示文字与链接相同：只输出链接一次', () => {
    expect(linkToText('https://example.com', 'https://example.com')).toBe('https://example.com');
  });
  it('显示文字为空：只输出链接', () => {
    expect(linkToText('', 'https://example.com')).toBe('https://example.com');
  });
  it('链接为空：只输出显示文字', () => {
    expect(linkToText('我的主页', '')).toBe('我的主页');
  });
  it('两者都为空：输出空串', () => {
    expect(linkToText('', '')).toBe('');
  });
});

describe('Url 字段（FieldType.Url）', () => {
  it('单链接片段：text + 空格 + link', () => {
    const v = [{ type: 'url', text: '我的主页', link: 'https://example.com' }];
    expect(formatCellValue(meta(FT.Url), v)).toBe('我的主页 https://example.com');
  });
  it('text 与 link 相同：只输出一次', () => {
    const v = [{ type: 'url', text: 'https://example.com', link: 'https://example.com' }];
    expect(formatCellValue(meta(FT.Url), v)).toBe('https://example.com');
  });
  it('空值输出空串', () => {
    expect(formatCellValue(meta(FT.Url), null)).toBe('');
  });
  it('多链接以空格分隔', () => {
    const v = [
      { type: 'url', text: 'A', link: 'https://a.cn' },
      { type: 'url', text: 'B', link: 'https://b.cn' },
    ];
    expect(formatCellValue(meta(FT.Url), v)).toBe('A https://a.cn B https://b.cn');
  });
});

describe('文本字段内嵌超链接（富文本片段）', () => {
  it('纯文本片段按原样拼接', () => {
    const segs = [
      { type: 'text', text: '第一行' },
      { type: 'text', text: '第二行' },
    ];
    expect(segmentsToText(segs)).toBe('第一行第二行');
  });
  it('内嵌链接片段按「显示文字 空格 原始链接」展开', () => {
    const segs = [
      { type: 'text', text: '详情见 ' },
      { type: 'url', text: '文档', link: 'https://d.cn/x' },
    ];
    expect(segmentsToText(segs)).toBe('详情见 文档 https://d.cn/x');
  });
  it('云文档 mention（带 link）同样展开', () => {
    const segs = [{ type: 'mention', text: '周报', link: 'https://d.cn/r' }];
    expect(segmentsToText(segs)).toBe('周报 https://d.cn/r');
  });
  it('@人 mention 输出名字', () => {
    const segs = [{ type: 'mention', text: '@张三', name: '张三' }];
    expect(segmentsToText(segs)).toBe('张三');
  });
});

describe('其他字段类型', () => {
  it('数字/货币原样输出', () => {
    expect(formatCellValue(meta(FT.Number), 3.14)).toBe('3.14');
    expect(formatCellValue(meta(FT.Currency), 100)).toBe('100');
  });
  it('复选框输出 true/false', () => {
    expect(formatCellValue(meta(FT.Checkbox), true)).toBe('true');
    expect(formatCellValue(meta(FT.Checkbox), false)).toBe('false');
  });
  it('单选输出选项文字', () => {
    expect(formatCellValue(meta(FT.SingleSelect), { id: '1', text: '进行中' })).toBe('进行中');
  });
  it('多选逗号拼接', () => {
    const v = [
      { id: '1', text: '甲' },
      { id: '2', text: '乙' },
    ];
    expect(formatCellValue(meta(FT.MultiSelect), v)).toBe('甲,乙');
  });
  it('日期输出 YYYY-MM-DD HH:mm:ss', () => {
    const ts = new Date(2026, 9, 12, 21, 30, 5).getTime();
    expect(formatCellValue(meta(FT.DateTime), ts)).toBe('2026-10-12 21:30:05');
  });
  it('人员输出姓名', () => {
    const v = [{ id: 'u1', name: '李雷' }];
    expect(formatCellValue(meta(FT.User), v)).toBe('李雷');
  });
  it('附件输出文件名', () => {
    const v = [{ name: 'a.png', size: 1, type: 'png', token: 't', timeStamp: 0 }];
    expect(formatCellValue(meta(FT.Attachment), v)).toBe('a.png');
  });
  it('空值一律输出空串', () => {
    expect(formatCellValue(meta(FT.Text), null)).toBe('');
    expect(formatCellValue(meta(FT.Number), null)).toBe('');
    expect(formatCellValue(meta(FT.User), null)).toBe('');
  });
});
