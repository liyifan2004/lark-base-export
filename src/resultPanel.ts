/**
 * 导出结果面板：统计信息 + 多策略保存按钮 + 复制兜底 + 右键指引。
 * 挂在 UIBuilder 容器（#container）之外，表单 reload 不会清掉它。
 */
import { formatBytes } from './core/csv';
import type { DownloadHandle, SaveStrategy } from './download';
import { copyCsv, saveCsv } from './download';
import { t, type MessageKey } from './i18n';

export interface ExportStats {
  records: number;
  fields: number;
}

const STATUS_TEXT: Record<SaveStrategy, MessageKey> = {
  picker: 'status.picker',
  popup: 'status.popup',
  anchor: 'status.anchor',
  clipboard: 'status.clipboard',
  none: 'status.none',
};

export function mountResultPanel(handle: DownloadHandle, stats: ExportStats): void {
  const el = document.getElementById('result-panel');
  if (!el) return;
  el.textContent = '';

  const card = document.createElement('div');
  card.className = 'result-card';

  /* 头部：徽标 + 统计 */
  const head = document.createElement('div');
  head.className = 'result-head';
  const badge = document.createElement('span');
  badge.className = 'result-badge';
  badge.textContent = t('result.badge');
  const statsRow = document.createElement('div');
  statsRow.className = 'result-stats';
  for (const text of [
    t('result.records', { n: stats.records }),
    t('result.fields', { n: stats.fields }),
    formatBytes(handle.size),
  ]) {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = text;
    statsRow.appendChild(chip);
  }
  head.append(badge, statsRow);

  /* 文件名 */
  const name = document.createElement('div');
  name.className = 'result-filename';
  name.textContent = handle.fileName;

  /* 主按钮：下载（同时保留 href 供右键「链接另存为 / 新标签页打开」） */
  const downloadBtn = document.createElement('a');
  downloadBtn.className = 'btn btn-primary';
  downloadBtn.href = handle.url;
  downloadBtn.download = handle.fileName;
  downloadBtn.rel = 'noopener';
  downloadBtn.textContent = t('result.download');
  downloadBtn.addEventListener('click', (ev) => {
    // 左键：走多策略瀑布（带探测与降级）；右键菜单不受影响
    ev.preventDefault();
    void runSave(handle, downloadBtn, status);
  });

  const copyBtn = document.createElement('button');
  copyBtn.className = 'btn btn-ghost';
  copyBtn.type = 'button';
  copyBtn.textContent = t('result.copy');
  copyBtn.addEventListener('click', () => {
    void (async () => {
      const ok = await copyCsv(handle.text);
      setStatus(status, ok ? t('status.copied', { size: formatBytes(handle.size) }) : t('status.copyFailed'));
    })();
  });

  const actions = document.createElement('div');
  actions.className = 'result-actions';
  actions.append(downloadBtn, copyBtn);

  /* 右键指引 + 状态行 */
  const hint = document.createElement('p');
  hint.className = 'result-hint';
  hint.textContent = t('result.hint');

  const status = document.createElement('p');
  status.className = 'result-status';

  card.append(head, name, actions, hint, status);
  el.appendChild(card);
}

export function clearResultPanel(): void {
  const el = document.getElementById('result-panel');
  if (el) el.textContent = '';
}

async function runSave(handle: DownloadHandle, btn: HTMLElement, status: HTMLElement): Promise<void> {
  btn.classList.add('is-busy');
  const strategy = await saveCsv(handle);
  btn.classList.remove('is-busy');
  if (strategy === 'clipboard') {
    setStatus(status, t('status.clipboard'));
  } else {
    setStatus(status, t(STATUS_TEXT[strategy]));
  }
}

function setStatus(el: HTMLElement, text: string): void {
  el.textContent = text;
  el.classList.remove('is-error');
  if (text.startsWith(t('status.none')) || text.startsWith(t('status.copyFailed'))) {
    el.classList.add('is-error');
  }
}
