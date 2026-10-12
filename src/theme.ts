/**
 * 深浅色主题适配：getTheme 初始化 + onThemeChange 监听，
 * 将主题写入 :root 的 data-theme 与 CSS 变量，供自定义元素使用。
 */
import { bitable, ThemeModeType, type ThemeModeCtx, type IEventCbCtx } from '@lark-base-open/js-sdk';

const THEME_VARS: Record<ThemeModeType, Record<string, string>> = {
  [ThemeModeType.LIGHT]: {
    '--lb-text': '#1f2329',
    '--lb-text-secondary': '#646a73',
    '--lb-bg': '#ffffff',
    '--lb-border': '#dee0e3',
    '--lb-accent': 'rgb(20, 86, 240)',
  },
  [ThemeModeType.DARK]: {
    '--lb-text': '#e8e8e8',
    '--lb-text-secondary': '#a6a6a6',
    '--lb-bg': '#252525',
    '--lb-border': '#434343',
    '--lb-accent': '#4571e1',
  },
};

export function applyTheme(theme: ThemeModeType): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  const vars = THEME_VARS[theme] ?? THEME_VARS[ThemeModeType.LIGHT];
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

export async function initTheme(): Promise<void> {
  applyTheme(await bitable.bridge.getTheme());
  bitable.bridge.onThemeChange((ev: IEventCbCtx<ThemeModeCtx>) => {
    applyTheme(ev.data.theme);
  });
}
