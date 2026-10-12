/**
 * UIBuilder 表单提交值归一化（纯函数，可单测）。
 *
 * SDK 约定（js-sdk UIBuilder 提交流程）：
 * - 提交时会把 'table' 项解析为 ITable 实例、'field' 项解析为 IField 实例（多选为实例数组）；
 * - 未触碰且无默认值的项不出现在 values 里（undefined）；
 * - 表单内部存的则是 id 字符串。
 * 因此这里统一接受「id 字符串 / 带 id 的对象 / 数组」三种形态，归一化为 id。
 */

/** 从任意形态里取单个 id：字符串、{id} 对象、数组（取第一个有效项） */
export function extractId(v: unknown): string | undefined {
  if (typeof v === 'string') return v === '' ? undefined : v;
  if (Array.isArray(v)) {
    for (const item of v) {
      const id = extractId(item);
      if (id !== undefined) return id;
    }
    return undefined;
  }
  if (typeof v === 'object' && v !== null) {
    const id = (v as { id?: unknown }).id;
    if (typeof id === 'string' && id !== '') return id;
  }
  return undefined;
}

/** 从任意形态里取 id 列表：undefined -> []，单值 -> [id]，数组 -> 展平后的 id 列表 */
export function extractIdList(v: unknown): string[] {
  if (v === null || v === undefined) return [];
  if (Array.isArray(v)) return v.flatMap((item) => extractIdList(item));
  const id = extractId(v);
  return id === undefined ? [] : [id];
}
