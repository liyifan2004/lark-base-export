/**
 * UIBuilder 表单：数据表选择（默认当前激活表）+ 字段勾选（默认全选 · 按表格列顺序）+ 导出按钮。
 * 导出后挂载结果面板（多策略保存 + 复制兜底）。
 */
import type { IFieldMeta, UIBuilder } from '@lark-base-open/js-sdk';
import { buildCsvWithBom, makeCsvFileName } from './core/csv';
import { formatCellValue } from './core/format';
import { extractId, extractIdList } from './core/values';
import { attemptAutoDownload, createDownload } from './download';
import { t } from './i18n';
import { mountResultPanel } from './resultPanel';
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
    uiBuilder.message.warning(t('msg.noTable'));
    return;
  }
  uiBuilder.showLoading(t('msg.exporting'));
  try {
    const table = await getTableById(tableId);
    const [tableName, metas, records] = await Promise.all([
      table.getName(),
      getFieldMetas(table),
      fetchAllRecords(table),
    ]);
    const chosen = pickFields(metas, values.fields);
    if (chosen.length === 0) throw new Error('no fields');
    const headers = chosen.map((m) => m.name);
    const rows = records.map((record) =>
      chosen.map((m) => formatCellValue(m, cellOf(record, m.id))),
    );
    const handle = createDownload(makeCsvFileName(tableName), buildCsvWithBom(headers, rows));
    attemptAutoDownload(handle);
    mountResultPanel(handle, { records: records.length, fields: chosen.length });
    if (records.length === 0) {
      uiBuilder.message.warning(t('msg.emptyTable'));
    } else {
      uiBuilder.message.success(
        t('msg.exported', {
          records: records.length,
          fields: chosen.length,
          name: handle.fileName,
        }),
      );
    }
  } catch (e) {
    uiBuilder.message.error(t('msg.exportFailed', { error: e instanceof Error ? e.message : String(e) }));
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

  uiBuilder.form(
    (form) => ({
      formItems: [
        form.tableSelect('table', {
          label: t('form.table.label'),
          placeholder: t('form.table.placeholder'),
          ...(defaultTableId ? { defaultValue: defaultTableId } : {}),
        }),
        form.fieldSelect('fields', {
          label: t('form.fields.label'),
          sourceTable: 'table',
          multiple: true,
          placeholder: t('form.fields.placeholder'),
          ...(allFieldIds.length > 0 ? { defaultValue: allFieldIds } : {}),
        }),
      ],
      buttons: [{ key: 'export', label: t('form.export') }],
    }),
    async ({ key, values }) => {
      if (key === 'export') await handleExport(uiBuilder, values);
    },
  );
}
