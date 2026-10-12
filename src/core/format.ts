/**
 * 单元格值 -> CSV 文本的纯函数转换。
 *
 * 硬性验收规则（超链接）：
 *   导出后单元格内容为「显示文字 + 空格 + 原始链接」；
 *   若显示文字与链接相同，只输出链接一次；任一为空则输出另一个；都为空输出空串。
 */
import { FT, type CellValue, type FieldMetaLike } from './types';

/** 片段输入的宽松形态：兼容 SDK 各类 segment 字面量（type 收窄在函数内部做） */
export interface SegmentLike {
  type: string;
  text: string;
  link?: string;
  name?: string;
}

/** 超链接片段的输出格式（验收硬性要求） */
export function linkToText(text: string, link: string): string {
  const t = (text ?? '').trim();
  const l = (link ?? '').trim();
  if (!t && !l) return '';
  if (!t) return l;
  if (!l) return t;
  return t === l ? l : `${t} ${l}`;
}

function isSegment(v: unknown): v is SegmentLike {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as SegmentLike).type === 'string' &&
    typeof (v as SegmentLike).text === 'string'
  );
}

function segmentToText(seg: SegmentLike): string {
  if (seg.type === 'url') return linkToText(seg.text, seg.link ?? '');
  if (seg.type === 'mention') {
    return seg.link ? linkToText(seg.text, seg.link) : seg.name || seg.text;
  }
  return seg.text;
}

/** 富文本/多行文本：片段内联拼接，链接片段按超链接规则展开 */
export function segmentsToText(segments: ReadonlyArray<SegmentLike>): string {
  return segments.map(segmentToText).join('');
}

function formatTimestamp(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  );
}

function textOf(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return '';
}

interface Obj {
  [k: string]: unknown;
}

function asObj(v: unknown): Obj | null {
  return typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Obj) : null;
}

/** 对象形态兜底：优先取语义化字段，避免输出 [object Object] */
function objectToText(v: unknown): string {
  const o = asObj(v);
  if (!o) return '';
  if (typeof o.text === 'string' && typeof o.link === 'string') {
    return linkToText(o.text, o.link);
  }
  if (typeof o.name === 'string' && o.name) return o.name;
  if (typeof o.text === 'string') return o.text;
  if (typeof o.value === 'string' || typeof o.value === 'number') return String(o.value);
  if (typeof o.fullAddress === 'string' && o.fullAddress) return o.fullAddress;
  if (typeof o.address === 'string' && o.address) return o.address;
  if (typeof o.display_number === 'string') return o.display_number;
  try {
    return JSON.stringify(o);
  } catch {
    return '';
  }
}

/** 通用值格式化（公式/引用/未识别类型兜底，也处理数组递归） */
function genericToText(v: CellValue): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) {
    if (v.length > 0 && v.every(isSegment)) return segmentsToText(v);
    return v.map(genericToText).filter((s) => s !== '').join(',');
  }
  return objectToText(v);
}

/** Url 字段：值是链接片段数组，每个片段按超链接规则展开，多链接以空格分隔 */
function urlFieldToText(v: CellValue): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  const list = Array.isArray(v) ? v : [v];
  return list
    .map((item) => {
      if (isSegment(item)) return segmentToText(item);
      return objectToText(item);
    })
    .filter((s) => s !== '')
    .join(' ');
}

/**
 * 按字段类型格式化单元格值。
 * @param meta 字段元信息（用 type 区分格式化策略）
 * @param value getRecordsByPage / getCellValue 返回的原始值
 */
export function formatCellValue(meta: FieldMetaLike, value: CellValue): string {
  switch (meta.type) {
    case FT.Text:
    case FT.Barcode:
    case FT.Email:
    case FT.Lookup:
    case FT.Formula:
      return genericToText(value);

    case FT.Url:
      return urlFieldToText(value);

    case FT.Number:
    case FT.Currency:
    case FT.Progress:
    case FT.Rating:
    case FT.Phone:
    case FT.AutoNumber:
      return genericToText(value);

    case FT.DateTime:
    case FT.CreatedTime:
    case FT.ModifiedTime:
      return typeof value === 'number' ? formatTimestamp(value) : genericToText(value);

    case FT.Checkbox:
      return typeof value === 'boolean' ? String(value) : genericToText(value);

    case FT.SingleSelect:
      return objectToText(value) || textOf(value);

    case FT.MultiSelect:
    case FT.User:
    case FT.CreatedUser:
    case FT.ModifiedUser:
    case FT.Attachment:
    case FT.GroupChat:
      return genericToText(value);

    case FT.SingleLink:
    case FT.DuplexLink: {
      const o = asObj(value);
      return o && typeof o.text === 'string' ? o.text : genericToText(value);
    }

    case FT.Location: {
      const o = asObj(value);
      if (!o) return genericToText(value);
      const full = textOf(o.fullAddress) || textOf(o.full_address);
      if (full) return full;
      const composed = [o.pname, o.cityname, o.adname, o.address].map(textOf).join('');
      return composed || textOf(o.name);
    }

    case FT.Object:
      try {
        return value === null || value === undefined ? '' : JSON.stringify(value);
      } catch {
        return '';
      }

    default:
      return genericToText(value);
  }
}
