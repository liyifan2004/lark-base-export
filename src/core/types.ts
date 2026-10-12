/**
 * 核心层的结构性类型：与 @lark-base-open/js-sdk 的值结构一一对应，
 * 但不依赖 SDK 运行时，便于在 Node 环境下单测。
 *
 * SDK 侧对应类型（src/sdk/data.ts 中有编译期结构校验）：
 *   IOpenTextSegment  -> TextSegment
 *   IOpenUrlSegment   -> UrlSegment
 *   IOpen*Segment     -> MentionSegment
 */

/** FieldType 数值枚举，与 SDK 的 FieldType 保持一致（见 src/sdk/data.ts 的编译期校验） */
export const FT = {
  Text: 1,
  Number: 2,
  SingleSelect: 3,
  MultiSelect: 4,
  DateTime: 5,
  Checkbox: 7,
  User: 11,
  Phone: 13,
  Url: 15,
  Attachment: 17,
  SingleLink: 18,
  Lookup: 19,
  Formula: 20,
  DuplexLink: 21,
  Location: 22,
  GroupChat: 23,
  Object: 25,
  CreatedTime: 1001,
  ModifiedTime: 1002,
  CreatedUser: 1003,
  ModifiedUser: 1004,
  AutoNumber: 1005,
  Barcode: 99001,
  Progress: 99002,
  Currency: 99003,
  Rating: 99004,
  Email: 99005,
} as const;

export interface FieldMetaLike {
  id: string;
  name: string;
  type: number;
}

export interface TextSegment {
  type: 'text';
  text: string;
}

export interface UrlSegment {
  type: 'url';
  text: string;
  link: string;
}

export interface MentionSegment {
  type: 'mention';
  text: string;
  /** 云文档类 mention 携带 link；@人 mention 没有 */
  link?: string;
  name?: string;
}

export type Segment = TextSegment | UrlSegment | MentionSegment;

/** getRecordsByPage 返回的单元格值是宽联合类型，格式化层按结构判别 */
export type CellValue = unknown;
