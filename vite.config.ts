import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// base: 独自ドメインなら PAGES_BASE=/、GitHub Pages のプロジェクトサイトなら /<リポジトリ名>/（SPEC §12.2）
const base = process.env.PAGES_BASE ?? '/shiinomori-archive/';

export default defineConfig({
  base,
  plugins: [preact()],
  build: { target: 'es2022', sourcemap: false },
});
