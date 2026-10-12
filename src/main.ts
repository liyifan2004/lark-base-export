/**
 * 入口：i18n + 主题适配 + UIBuilder 挂载 + 数据变化事件监听（无需手动刷新）。
 *
 * 事件策略：
 * - 表/字段结构变化（TableAdd/Delete、FieldAdd/Delete/Modify、切换数据表）：
 *   防抖重建表单（uiBuilder.reload 会清空并重跑回调，字段列表与默认值保持同步）
 * - 记录变化（RecordAdd/Delete/Modify）：导出时实时读取整表数据，天然同步；
 *   这里更新底部状态条，提示数据已同步，避免频繁重建打断用户勾选
 */
import './style.css';
import { UIBuilder, bitable, type IEventCbCtx, type Selection } from '@lark-base-open/js-sdk';
import { getLang, setLang, t, type MessageKey } from './i18n';
import runUIBuilder from './runUIBuilder';
import { initTheme } from './theme';

function updateSyncStatus(note: string): void {
  const el = document.getElementById('sync-status');
  if (el) {
    el.textContent = `${note} · ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`;
  }
}

function syncStatus(key: MessageKey): void {
  updateSyncStatus(t(key));
}

function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return ((...args: never[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

function renderHeader(): void {
  document.documentElement.lang = getLang() === 'zh' ? 'zh-CN' : 'en';
  const title = document.getElementById('app-title');
  if (title) title.textContent = t('app.title');
  const summary = document.getElementById('app-help-summary');
  if (summary) summary.textContent = t('help.summary');
  const body = document.getElementById('app-help-body');
  if (body) body.textContent = t('help.body');
  const sync = document.getElementById('sync-status');
  if (sync) sync.textContent = t('sync.ready');
}

async function bootstrap(): Promise<void> {
  setLang(await bitable.bridge.getLanguage().catch(() => 'zh'));
  renderHeader();
  await initTheme();

  const container = document.querySelector('#container') as HTMLElement;
  // SDK 内部文案跟随当前语言（我方文案走 i18n.ts）
  const translation = { t: (key: string) => key, i18n: { language: getLang() } };
  const uiBuilder = new UIBuilder(container, {
    bitable,
    callback: runUIBuilder,
    translation,
  });

  /* ---------- 表单防抖重建 ---------- */
  const reloadForm = debounce((note: string) => {
    updateSyncStatus(note);
    uiBuilder.reload();
  }, 500);

  /* ---------- 表级事件（字段/记录变化） ---------- */
  let tableUnsubs: Array<() => void> = [];
  let boundTableId: string | undefined;

  const bindTableEvents = async (tableId: string): Promise<void> => {
    if (tableId === boundTableId) return;
    boundTableId = tableId;
    tableUnsubs.forEach((u) => u());
    tableUnsubs = [];
    try {
      const table = await bitable.base.getTableById(tableId);
      const onStructure = () => reloadForm(t('sync.fieldStructure'));
      const onData = () => syncStatus('sync.dataSynced');
      tableUnsubs = [
        table.onFieldAdd(onStructure),
        table.onFieldDelete(onStructure),
        table.onFieldModify(onStructure),
        table.onRecordAdd(onData),
        table.onRecordDelete(onData),
        table.onRecordModify(onData),
      ];
    } catch {
      syncStatus('sync.bindFailed');
    }
  };

  /* ---------- base 级事件（表增删、选中变化） ---------- */
  bitable.base.onTableAdd(() => reloadForm(t('sync.tableAdded')));
  bitable.base.onTableDelete(() => reloadForm(t('sync.tableDeleted')));
  bitable.base.onSelectionChange((ev: IEventCbCtx<Selection>) => {
    const tableId = ev.data?.tableId;
    if (tableId && tableId !== boundTableId) {
      void bindTableEvents(tableId);
      reloadForm(t('sync.tableSwitched'));
    }
  });

  // 初始绑定当前激活表
  const selection = await bitable.base.getSelection().catch(() => undefined);
  const activeTableId =
    selection?.tableId ?? (await bitable.base.getTableMetaList().catch(() => []))[0]?.id;
  if (activeTableId) void bindTableEvents(activeTableId);

  syncStatus('sync.ready');
}

void bootstrap();
