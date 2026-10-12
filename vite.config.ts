/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  // 构建产物资源引用必须使用相对路径（插件静态部署要求）
  base: './',
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
