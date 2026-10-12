/**
 * 浏览器本地生成 CSV 并保存，不发起任何网络请求（数据安全要求）。
 *
 * 实测背景（浏览器版飞书边栏插件）：插件 iframe 常被沙箱限制，
 * 带 download 属性的点击（下载动作）与 target=_blank（弹窗动作）都可能被拦截，
 * 而「右键 → 在新标签页打开 / 链接另存为」由浏览器自身发起，始终可用。
 * SDK 无任何宿主级保存 API（bridge/ui 均无 download/save）。
 *
 * 因此保存走「多策略瀑布」，前一个被环境拦截就自动降级到下一个：
 *   1. showSaveFilePicker  系统原生保存对话框（最强，受限环境抛异常）
 *   2. window.open         新标签页导航（可探测：返回 null 即被拦）
 *   3. <a download>.click  传统下载（不可探测，乐观返回）
 *   4. clipboard.writeText 复制到剪贴板（可粘贴进 Excel 另存）
 *   5. execCommand('copy') 旧式复制兜底
 * 全部失败时由结果面板给出右键指引（唯一必通路径）。
 */

/** blob URL 保留时长：覆盖用户反复重试与右键保存的时间窗 */
const KEEP_ALIVE_MS = 15 * 60_000;

export interface DownloadHandle {
  fileName: string;
  /** blob: URL，可挂到 <a href> 上供右键菜单使用 */
  url: string;
  /** CSV 全文（含 BOM），供剪贴板兜底 */
  text: string;
  /** 字节数 */
  size: number;
}

export type SaveStrategy = 'picker' | 'popup' | 'anchor' | 'clipboard' | 'none';

export function createDownload(fileName: string, csvTextWithBom: string): DownloadHandle {
  const blob = new Blob([csvTextWithBom], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = buildAnchor(url, fileName, true);
  document.body.appendChild(anchor);
  // 锚点与 blob URL 延迟清理（FileSaver 同款）：下载任务异步读 blob，
  // 同步 revoke 会把下载掐掉
  setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, KEEP_ALIVE_MS);
  return { fileName, url, text: csvTextWithBom, size: blob.size };
}

/** 导出完成后的静默自动下载尝试（受限环境被拦则由结果面板接管） */
export function attemptAutoDownload(handle: DownloadHandle): void {
  const a = buildAnchor(handle.url, handle.fileName, true);
  document.body.appendChild(a);
  try {
    a.click();
  } catch {
    /* 交给结果面板的多策略按钮 */
  }
  setTimeout(() => a.remove(), KEEP_ALIVE_MS);
}

/** 多策略保存瀑布，返回实际采用的策略 */
export async function saveCsv(handle: DownloadHandle): Promise<SaveStrategy> {
  // 1. 系统保存对话框
  const picker = (window as { showSaveFilePicker?: (o: unknown) => Promise<unknown> })
    .showSaveFilePicker;
  if (typeof picker === 'function') {
    try {
      const fileHandle = (await picker.call(window, {
        suggestedName: handle.fileName,
        types: [{ description: 'CSV', accept: { 'text/csv': ['.csv'] } }],
      })) as { createWritable: () => Promise<{ write: (d: Blob) => Promise<void>; close: () => Promise<void> }> };
      const writable = await fileHandle.createWritable();
      await writable.write(new Blob([handle.text], { type: 'text/csv;charset=utf-8' }));
      await writable.close();
      return 'picker';
    } catch (e) {
      // 用户主动取消 = 已完成交互；权限/环境问题则继续降级
      if (e instanceof DOMException && e.name === 'AbortError') return 'picker';
    }
  }

  // 2. 新标签页导航（实测：浏览器对 text/csv 的导航会转为下载）
  try {
    const win = window.open(handle.url, '_blank');
    if (win) return 'popup';
  } catch {
    /* 继续降级 */
  }

  // 3. 传统 download 属性点击（不可探测，乐观返回）
  const a = buildAnchor(handle.url, handle.fileName, true);
  document.body.appendChild(a);
  try {
    a.click();
    return 'anchor';
  } catch {
    a.remove();
  }

  // 4. 剪贴板
  if (await copyCsv(handle.text)) return 'clipboard';

  // 5. 旧式复制兜底
  return legacyCopy(handle.text) ? 'clipboard' : 'none';
}

/** 复制 CSV 全文到剪贴板（含 BOM 原文，粘贴进 Excel 即可另存） */
export async function copyCsv(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return legacyCopy(text);
  }
}

/** document.execCommand 旧式复制，不受 Permissions Policy 的 clipboard 限制 */
function legacyCopy(text: string): boolean {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

function buildAnchor(url: string, fileName: string, downloadAttr: boolean): HTMLAnchorElement {
  const a = document.createElement('a');
  a.href = url;
  if (downloadAttr) a.download = fileName;
  a.rel = 'noopener';
  // 离屏但不 display:none——个别环境对隐藏锚点不触发下载
  a.style.position = 'fixed';
  a.style.left = '-9999px';
  a.style.top = '0';
  a.style.opacity = '0';
  return a;
}
