import { describe, expect, it } from 'vitest';
import { extractId, extractIdList } from '../src/core/values';

describe('extractId（表选择的值归一化）', () => {
  it('id 字符串原样返回', () => {
    expect(extractId('tbl123')).toBe('tbl123');
  });
  it('SDK 提交的对象形态（ITable/IField 实例）取 .id', () => {
    expect(extractId({ id: 'tbl123', name: '客户表', getName: () => {} })).toBe('tbl123');
  });
  it('数组取第一个有效项', () => {
    expect(extractId([{ id: 'a' }, { id: 'b' }])).toBe('a');
  });
  it('空串/undefined/空对象返回 undefined', () => {
    expect(extractId('')).toBeUndefined();
    expect(extractId(undefined)).toBeUndefined();
    expect(extractId(null)).toBeUndefined();
    expect(extractId({})).toBeUndefined();
    expect(extractId([])).toBeUndefined();
  });
});

describe('extractIdList（字段勾选的值归一化）', () => {
  it('对象数组（SDK 提交的 IField 实例数组）取 id 列表', () => {
    const v = [
      { id: 'fld1', name: '名称', type: 1 },
      { id: 'fld2', name: '链接', type: 15 },
    ];
    expect(extractIdList(v)).toEqual(['fld1', 'fld2']);
  });
  it('字符串数组原样返回', () => {
    expect(extractIdList(['fld1', 'fld2'])).toEqual(['fld1', 'fld2']);
  });
  it('单值包成一元数组', () => {
    expect(extractIdList({ id: 'fld1' })).toEqual(['fld1']);
    expect(extractIdList('fld1')).toEqual(['fld1']);
  });
  it('空值返回空数组', () => {
    expect(extractIdList(undefined)).toEqual([]);
    expect(extractIdList(null)).toEqual([]);
    expect(extractIdList([])).toEqual([]);
  });
  it('混合形态展平并剔除无效项', () => {
    expect(extractIdList([{ id: 'a' }, 'b', null, {}, ['c']])).toEqual(['a', 'b', 'c']);
  });
});
