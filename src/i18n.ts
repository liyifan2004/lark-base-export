/**
 * 极简 i18n（上架要求：界面支持中文、英文）。
 * 纯函数层，不依赖 SDK；语言由 main.ts 从 bridge.getLanguage() 初始化。
 */
export type Lang = 'zh' | 'en';

const dict = {
  zh: {
    'app.title': 'CSV 导出',
    'help.summary': '使用说明',
    'help.body':
      '- 选择数据表与字段（默认全选），点「导出 CSV」\n' +
      '- 超链接导出为：显示文字 空格 原始链接\n' +
      '- UTF-8 带 BOM，Excel 打开中文不乱码\n' +
      '- 全部在浏览器本地生成，不外发数据',
    'form.table.label': '选择数据表',
    'form.table.placeholder': '请选择数据表',
    'form.fields.label': '选择字段（默认全选）',
    'form.fields.placeholder': '留空导出全部字段',
    'form.export': '导出 CSV',
    'msg.noTable': '当前多维表格里没有可导出的数据表',
    'msg.exporting': '正在导出，请稍候…',
    'msg.emptyTable': '数据表没有记录，已仅导出表头',
    'msg.exported': '已导出 {records} 条记录、{fields} 个字段（{name}）',
    'msg.exportFailed': '导出失败：{error}',
    'result.badge': '导出完成',
    'result.records': '{n} 条记录',
    'result.fields': '{n} 个字段',
    'result.download': '下载 CSV',
    'result.copy': '复制 CSV 内容',
    'result.hint': '若点击无反应：右键按钮 →「链接另存为」或「在新标签页打开」',
    'status.picker': '已打开系统保存对话框',
    'status.popup': '已打开新标签页，请在浏览器下载列表确认',
    'status.anchor': '已发起下载 · 若无反应请右键按钮',
    'status.clipboard': '下载被环境拦截，已复制 CSV 内容，可粘贴到 Excel 保存',
    'status.none': '本环境拦截了下载与复制 · 请右键按钮 →「在新标签页打开」',
    'status.copied': '已复制 CSV 内容（{size}）',
    'status.copyFailed': '复制失败 · 请右键按钮 →「链接另存为」',
    'sync.ready': '就绪',
    'sync.fieldStructure': '字段结构已更新',
    'sync.dataSynced': '数据已同步',
    'sync.tableAdded': '数据表已新增',
    'sync.tableDeleted': '数据表已删除',
    'sync.tableSwitched': '已切换数据表',
    'sync.bindFailed': '事件绑定失败，导出时仍读取实时数据',
  },
  en: {
    'app.title': 'CSV Export',
    'help.summary': 'How to use',
    'help.body':
      '- Pick a table and fields (all selected by default), then click "Export CSV"\n' +
      '- Hyperlinks export as: text space url\n' +
      '- UTF-8 with BOM for Excel compatibility\n' +
      '- Generated locally in your browser; no data leaves the page',
    'form.table.label': 'Table',
    'form.table.placeholder': 'Select a table',
    'form.fields.label': 'Fields (all selected by default)',
    'form.fields.placeholder': 'Leave empty to export all fields',
    'form.export': 'Export CSV',
    'msg.noTable': 'No table available to export',
    'msg.exporting': 'Exporting, please wait…',
    'msg.emptyTable': 'Table has no records; exported headers only',
    'msg.exported': 'Exported {records} records × {fields} fields ({name})',
    'msg.exportFailed': 'Export failed: {error}',
    'result.badge': 'Export complete',
    'result.records': '{n} records',
    'result.fields': '{n} fields',
    'result.download': 'Download CSV',
    'result.copy': 'Copy CSV text',
    'result.hint': 'If nothing happens: right-click the button → "Save link as" or "Open in new tab"',
    'status.picker': 'System save dialog opened',
    'status.popup': 'Opened in a new tab — check your downloads',
    'status.anchor': 'Download started · if nothing happens, right-click the button',
    'status.clipboard': 'Download blocked here; CSV copied — paste into Excel to save',
    'status.none': 'Downloads & clipboard blocked here · right-click → "Open in new tab"',
    'status.copied': 'CSV copied to clipboard ({size})',
    'status.copyFailed': 'Copy failed · right-click the button → "Save link as"',
    'sync.ready': 'Ready',
    'sync.fieldStructure': 'Field structure updated',
    'sync.dataSynced': 'Data synced',
    'sync.tableAdded': 'Table added',
    'sync.tableDeleted': 'Table deleted',
    'sync.tableSwitched': 'Table switched',
    'sync.bindFailed': 'Event binding failed; export still reads live data',
  },
} as const;

export type MessageKey = keyof (typeof dict)['zh'];

let lang: Lang = 'zh';

export function setLang(next: string | undefined): void {
  lang = next && next.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export function getLang(): Lang {
  return lang;
}

/** 取文案，支持 {name} 占位符插值 */
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  let text: string = dict[lang][key] ?? dict.zh[key];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.split(`{${k}}`).join(String(v));
    }
  }
  return text;
}
