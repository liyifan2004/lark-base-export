/**
 * 浏览器本地生成 CSV 下载，不发起任何网络请求（数据安全要求）。
 *
 * 背景（实测修复「提示导出成功但没有文件下载」）：
 * 1. 旧实现 a.click() 后立即 a.remove() + URL.revokeObjectURL(url)。
 *    webview 的下载任务是异步读取 blob URL 的，同步撤销会把下载直接掐掉。
 * 2. 自动触发的 a.click() 发生在多个 await 之后，个别 webview 要求
 *    真实用户手势才允许下载，此时不会有任何反应。
 * 因此采用 FileSaver 同款策略：锚点离屏保留、blob URL 延迟清理，
 * 并提供「手动保存」兜底链接（真实用户点击，必然触发下载）。
 */

/** blob URL / 锚点保留时长：足够下载任务读取，也给兜底链接留出点击窗口 */
const KEEP_ALIVE_MS = 5 * 60_000;

export interface DownloadHandle {
  fileName: string;
  /** blob: URL，可挂到兜底 <a download> 上 */
  url: string;
}

export function downloadCsv(fileName: string, csvTextWithBom: string): DownloadHandle {
  const blob = new Blob([csvTextWithBom], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  // 离屏保留但不 display:none——个别 webview 对隐藏锚点不触发下载
  a.style.position = 'fixed';
  a.style.left = '-9999px';
  a.style.top = '0';
  a.style.opacity = '0';
  document.body.appendChild(a);
  try {
    a.click();
  } catch {
    /* 自动触发失败时由「手动保存」兜底链接接管 */
  }

  // 延迟清理（FileSaver 同款），确保异步下载任务能读到 blob 内容
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, KEEP_ALIVE_MS);

  return { fileName, url };
}

/**
 * 渲染「下载」兜底按钮。
 * 挂在 UIBuilder 容器（#container）之外，表单 reload 不会把它清掉；传 null 清空。
 *
 * 实测（浏览器版飞书）：带 download 属性的左键点击=下载动作，会被沙箱拦截而无反应；
 * 「新标签页打开」=导航动作，能正常下载。故兜底链接不带 download 属性、
 * 用 target=_blank 做导航（与右键「在新标签页打开」同一动作）。
 */
export function renderFallbackLink(handle: DownloadHandle | null): void {
  const el = document.getElementById('download-fallback');
  if (!el) return;
  el.textContent = '';
  if (!handle) return;

  const hint = document.createElement('p');
  hint.className = 'fallback-hint';
  hint.textContent = '若浏览器没有开始下载，请点此下载（没反应就右键 → 在新标签页打开）：';

  const a = document.createElement('a');
  a.className = 'fallback-link';
  a.href = handle.url;
  a.target = '_blank';
  a.rel = 'noopener';
  a.textContent = `下载 ${handle.fileName}`;

  el.append(hint, a);
}
