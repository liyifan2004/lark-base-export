/**
 * 入口：主题适配 + UIBuilder 挂载 + 数据变化事件监听（无需手动刷新）。
 *
 * 事件策略：
 * - 表/字段结构变化（TableAdd/Delete、FieldAdd/Delete/Modify、切换数据表）：
 *   防抖重建表单（uiBuilder.reload 会清空并重跑回调，字段列表与默认值保持同步）
 * - 记录变化（RecordAdd/Delete/Modify）：导出时实时读取整表数据，天然同步；
 *   这里更新底部状态条，提示数据已同步，避免频繁重建打断用户勾选
 */
import './style.css';
import { UIBuilder, bitable, type IEventCbCtx, type Selection } from '@lark-base-open/js-sdk';
import runUIBuilder from './runUIBuilder';
import { initTheme } from './theme';

function updateSyncStatus(note: string): void {
  const el = document.getElementById('sync-status');
  if (el) {
    el.textContent = `${note} · ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`;
  }
}

function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return ((...args: never[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

async function bootstrap(): Promise<void> {
  await initTheme();

  const container = document.querySelector('#container') as HTMLElement;
  // MVP 仅中文；i18n 属于可选扩展。这里提供最小 stub 供 SDK 内部文案使用
  const translation = { t: (key: string) => key, i18n: { language: 'zh' } };
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
      const onStructure = () => reloadForm('字段结构已更新');
      const onData = () => updateSyncStatus('数据已同步');
      tableUnsubs = [
        table.onFieldAdd(onStructure),
        table.onFieldDelete(onStructure),
        table.onFieldModify(onStructure),
        table.onRecordAdd(onData),
        table.onRecordDelete(onData),
        table.onRecordModify(onData),
      ];
    } catch {
      updateSyncStatus('事件绑定失败，导出时仍读取实时数据');
    }
  };

  /* ---------- base 级事件（表增删、选中变化） ---------- */
  bitable.base.onTableAdd(() => reloadForm('数据表已新增'));
  bitable.base.onTableDelete(() => reloadForm('数据表已删除'));
  bitable.base.onSelectionChange((ev: IEventCbCtx<Selection>) => {
    const tableId = ev.data?.tableId;
    if (tableId && tableId !== boundTableId) {
      void bindTableEvents(tableId);
      reloadForm('已切换数据表');
    }
  });

  // 初始绑定当前激活表
  const selection = await bitable.base.getSelection().catch(() => undefined);
  const activeTableId =
    selection?.tableId ?? (await bitable.base.getTableMetaList().catch(() => []))[0]?.id;
  if (activeTableId) void bindTableEvents(activeTableId);

  updateSyncStatus('就绪');
}

void bootstrap();
