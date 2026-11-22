import preact from '@preact/preset-vite';
import { defineConfig, type Plugin } from 'vite';
import site from './config/site.json' with { type: 'json' };

// base: 独自ドメインなら PAGES_BASE=/、GitHub Pages のプロジェクトサイトなら /<リポジトリ名>/（SPEC §12.2）
const base = process.env.PAGES_BASE ?? '/shiinomori-archive/';

/** 本番ビルドだけ CSP を <meta> で入れる（開発時は Vite/prefresh のインラインスクリプトがあるため入れない）（SPEC §9） */
function cspMeta(): Plugin {
  const imgHosts = site.images.hosts.map((h) => `https://${h}`).join(' ');
  const csp = [
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self'",
    `img-src 'self' data: ${imgHosts}`,
    "font-src 'self'",
    "connect-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');
  return {
    name: 'csp-meta',
    apply: 'build',
    transformIndexHtml: (html) => html.replace('<meta charset="utf-8" />', `<meta charset="utf-8" />\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`),
  };
}

/** fontsource の CSS から .woff のフォールバックを落とす（対応環境はすべて woff2 対応。dist を半分にする） */
function woff2Only(): Plugin {
  return {
    name: 'woff2-only',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('@fontsource/') || !id.endsWith('.css')) return null;
      return { code: code.replace(/,\s*url\([^)]*\.woff\)\s*format\('woff'\)/g, ''), map: null };
    },
  };
}

export default defineConfig({
  base,
  plugins: [preact(), woff2Only(), cspMeta()],
  build: { target: 'es2022', sourcemap: false },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
});
