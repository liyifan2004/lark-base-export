/**
 * 测试入口：把临时目录重定向到项目内 .tmp/ 再跑 vitest。
 * 原因：vitest 的模块转换缓存固定写 os.tmpdir()，在本机环境偶发 EPERM 导致测试文件加载失败。
 */
import { mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = path.join(root, '.tmp');
mkdirSync(tmp, { recursive: true });

const env = { ...process.env, TMPDIR: tmp, TMP: tmp, TEMP: tmp };
const vitest = path.join(root, 'node_modules', 'vitest', 'vitest.mjs');
const result = spawnSync(process.execPath, [vitest, 'run', ...process.argv.slice(2)], {
  cwd: root,
  env,
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
