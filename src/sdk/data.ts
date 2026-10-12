/**
 * SDK 数据访问层：只做取数与类型收窄，不做格式化。
 * 全部走批量接口（getRecordsByPage 分页），避免单条循环调用。
 */
import {
  FieldType,
  bitable,
  type IFieldMeta,
  type IOpenCellValue,
  type IOpenSegment,
  type IOpenUrlSegment,
  type IRecord,
  type ITable,
  type ITableMeta,
  type IUrlField,
  type ITextField,
} from '@lark-base-open/js-sdk';
import { FT, type FieldMetaLike, type Segment, type UrlSegment } from '../core/types';

/* ---------- 编译期：SDK 的值结构可安全流入核心层结构类型 ---------- */
type _AssertUrl = IOpenUrlSegment extends UrlSegment ? true : never;
type _AssertSeg = IOpenSegment extends Segment ? true : never;
type _AssertMeta = IFieldMeta extends FieldMetaLike ? true : never;
const _compileTimeChecks: [_AssertUrl, _AssertSeg, _AssertMeta] = [true, true, true];
void _compileTimeChecks;

/* ---------- 运行期：FT 数值与 SDK FieldType 一致 ---------- */
const FT_TO_SDK: Array<[number, FieldType]> = [
  [FT.Text, FieldType.Text],
  [FT.Number, FieldType.Number],
  [FT.SingleSelect, FieldType.SingleSelect],
  [FT.MultiSelect, FieldType.MultiSelect],
  [FT.DateTime, FieldType.DateTime],
  [FT.Checkbox, FieldType.Checkbox],
  [FT.User, FieldType.User],
  [FT.Phone, FieldType.Phone],
  [FT.Url, FieldType.Url],
  [FT.Attachment, FieldType.Attachment],
  [FT.SingleLink, FieldType.SingleLink],
  [FT.Lookup, FieldType.Lookup],
  [FT.Formula, FieldType.Formula],
  [FT.DuplexLink, FieldType.DuplexLink],
  [FT.Location, FieldType.Location],
  [FT.GroupChat, FieldType.GroupChat],
  [FT.Object, FieldType.Object],
  [FT.CreatedTime, FieldType.CreatedTime],
  [FT.ModifiedTime, FieldType.ModifiedTime],
  [FT.CreatedUser, FieldType.CreatedUser],
  [FT.ModifiedUser, FieldType.ModifiedUser],
  [FT.AutoNumber, FieldType.AutoNumber],
  [FT.Barcode, FieldType.Barcode],
  [FT.Progress, FieldType.Progress],
  [FT.Currency, FieldType.Currency],
  [FT.Rating, FieldType.Rating],
  [FT.Email, FieldType.Email],
];
for (const [local, sdk] of FT_TO_SDK) {
  if (local !== sdk) {
    throw new Error(`FieldType 映射不一致：core=${local} sdk=${sdk}`);
  }
}

const PAGE_SIZE = 200; // getRecordsByPage 单次上限
const MAX_PAGES = 5000; // 安全阀，防止异常分页死循环

export async function getTableList(): Promise<ITableMeta[]> {
  return bitable.base.getTableMetaList();
}

/** 当前激活表 id；取不到（如无选中）时回落到第一张表 */
export async function getDefaultTableId(tables: ITableMeta[]): Promise<string | undefined> {
  try {
    const selection = await bitable.base.getSelection();
    if (selection?.tableId) return selection.tableId;
  } catch {
    // 忽略，走回落逻辑
  }
  return tables[0]?.id;
}

export async function getTableById(tableId: string): Promise<ITable> {
  return bitable.base.getTableById(tableId);
}

/**
 * 字段元信息（有序）：以「视图内字段顺序」为准，与多维表格里看到的列顺序一致。
 * table.getFieldMetaList() 不保证顺序；view.getFieldMetaList() 在 SDK 中明确标注「有序」。
 * 取不到视图时回落 table 顺序。
 */
export async function getFieldMetas(table: ITable): Promise<IFieldMeta[]> {
  try {
    const selection = await bitable.base.getSelection();
    const views = await table.getViewList();
    const view = views.find((v) => v.id === selection?.viewId) ?? views[0];
    if (view) return await view.getFieldMetaList();
  } catch {
    // 视图接口不可用时回落 table 顺序
  }
  return table.getFieldMetaList();
}

/** 分页拉取整表记录（批量接口） */
export async function fetchAllRecords(table: ITable): Promise<IRecord[]> {
  const records: IRecord[] = [];
  let pageToken: number | undefined;
  for (let i = 0; i < MAX_PAGES; i++) {
    const res = await table.getRecordsByPage({
      pageSize: PAGE_SIZE,
      ...(pageToken !== undefined ? { pageToken } : {}),
    });
    records.push(...res.records);
    if (!res.hasMore || res.pageToken === undefined) break;
    pageToken = res.pageToken;
  }
  return records;
}

/** 取单元格原始值（批量结果里按 fieldId 取，缺省为 null） */
export function cellOf(record: IRecord, fieldId: string): IOpenCellValue {
  return record.fields[fieldId] ?? null;
}

/**
 * 类型化字段读取示例入口：Url 字段限定 IUrlField、文本字段限定 ITextField，
 * 在 SDK 侧获得完整类型提示（核心格式化层不依赖 SDK，值按结构判别）。
 */
export type { IUrlField, ITextField };
