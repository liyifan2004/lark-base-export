/**
 * UIBuilder 表单：数据表选择（默认当前激活表）+ 字段勾选（默认全选）+ 导出按钮。
 */
import type { IFieldMeta, UIBuilder } from '@lark-base-open/js-sdk';
import { buildCsvWithBom, makeCsvFileName } from './core/csv';
import { formatCellValue } from './core/format';
import { extractId, extractIdList } from './core/values';
import { downloadCsv, renderFallbackLink } from './download';
import {
  cellOf,
  fetchAllRecords,
  getDefaultTableId,
  getFieldMetas,
  getTableById,
  getTableList,
} from './sdk/data';

/**
 * 确定要导出的表：
 * 1) 用户在下拉框里选的（SDK 提交时是 ITable 对象，也兼容 id 字符串）；
 * 2) 没选/没触碰 -> 当前激活表（需求的默认语义）；
 * 3) 再不行 -> 第一张表。
 */
async function resolveTableId(values: Record<string, unknown>): Promise<string | undefined> {
  const picked = extractId(values.table);
  if (picked) return picked;
  const tables = await getTableList().catch(() => []);
  return getDefaultTableId(tables);
}

/**
 * 决定导出列：勾选为空（默认全选/未勾选）导出全部；
 * 勾选集合与实际字段无交集（如切表后的残留勾选）也回落到全部。
 */
export function pickFields(metas: IFieldMeta[], selected: unknown): IFieldMeta[] {
  const ids = new Set(extractIdList(selected));
  if (ids.size === 0) return metas;
  const picked = metas.filter((m) => ids.has(m.id));
  return picked.length > 0 ? picked : metas;
}

async function handleExport(uiBuilder: UIBuilder, values: Record<string, unknown>): Promise<void> {
  const tableId = await resolveTableId(values);
  if (!tableId) {
    uiBuilder.message.warning('当前多维表格里没有可导出的数据表');
    return;
  }
  uiBuilder.showLoading('正在导出，请稍候…');
  try {
    const table = await getTableById(tableId);
    const [tableName, metas, records] = await Promise.all([
      table.getName(),
      getFieldMetas(table),
      fetchAllRecords(table),
    ]);
    const chosen = pickFields(metas, values.fields);
    if (chosen.length === 0) throw new Error('所选字段为空');
    const headers = chosen.map((m) => m.name);
    const rows = records.map((record) =>
      chosen.map((m) => formatCellValue(m, cellOf(record, m.id))),
    );
    const handle = downloadCsv(makeCsvFileName(tableName), buildCsvWithBom(headers, rows));
    renderFallbackLink(handle);
    uiBuilder.message.success(
      `已导出 ${records.length} 条记录、${chosen.length} 个字段（${handle.fileName}）· 若没开始下载请点下方蓝色按钮`,
    );
  } catch (e) {
    uiBuilder.message.error(`导出失败：${e instanceof Error ? e.message : String(e)}`);
  } finally {
    uiBuilder.hideLoading();
  }
}

export default async function runUIBuilder(uiBuilder: UIBuilder): Promise<void> {
  const tables = await getTableList().catch(() => []);
  const defaultTableId = await getDefaultTableId(tables);
  const defaultFields = defaultTableId
    ? await getTableById(defaultTableId)
        .then(getFieldMetas)
        .catch(() => [] as IFieldMeta[])
    : [];
  const allFieldIds = defaultFields.map((f) => f.id);

  uiBuilder.markdown(
    '**CSV 导出** — 选择数据表与字段（默认全选），点击「导出 CSV」。\n\n' +
      '- 超链接导出为：`显示文字 空格 原始链接`\n' +
      '- UTF-8 带 BOM，Excel 打开中文不乱码\n' +
      '- 全部在浏览器本地生成，不外发数据',
  );

  uiBuilder.form(
    (form) => ({
      formItems: [
        form.tableSelect('table', {
          label: '选择数据表',
          placeholder: '请选择数据表',
          ...(defaultTableId ? { defaultValue: defaultTableId } : {}),
        }),
        form.fieldSelect('fields', {
          label: '选择字段（默认全选）',
          sourceTable: 'table',
          multiple: true,
          placeholder: '留空导出全部字段',
          ...(allFieldIds.length > 0 ? { defaultValue: allFieldIds } : {}),
        }),
      ],
      buttons: [{ key: 'export', label: '导出 CSV' }],
    }),
    async ({ key, values }) => {
      if (key === 'export') await handleExport(uiBuilder, values);
    },
  );
}
