import preact from '@preact/preset-vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, type Plugin } from 'vite';
import site from './config/site.json' with { type: 'json' };
import { placeholderSvg, seedOf } from './scripts/fixtures/placeholder.ts';

// base: 独自ドメインなら PAGES_BASE=/、GitHub Pages のプロジェクトサイトなら /<リポジトリ名>/（SPEC §12.2）
const base = process.env.PAGES_BASE ?? '/shiinomori-archive/';

/** VITE_PHOTO_SOURCE=local のとき、/fixture-img/{id}.svg を ID から生成して返す（Drive なしで全体を動かす） */
function fixtureImages(): Plugin {
  const handler = (req: IncomingMessage, res: ServerResponse, next: () => void): void => {
    const m = /\/fixture-img\/([^/?]+)\.svg(?:\?(.*))?$/.exec(req.url ?? '');
    if (!m) return next();
    const id = decodeURIComponent(m[1]!);
    const q = new URLSearchParams(m[2] ?? '');
    const w = Number(q.get('w') ?? 400);
    // 1/40 の写真は読み込み失敗を模す（予備 URL と灰色の枠の確認用）。予備は成功する
    if (q.get('v') === 'primary' && seedOf(id) % 40 === 0) {
      res.statusCode = 429;
      res.end();
      return;
    }
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.end(placeholderSvg(id, w, seedOf(id) % 4 === 1));
  };
  return {
    name: 'fixture-images',
    configureServer: (s) => void s.middlewares.use(handler),
    configurePreviewServer: (s) => void s.middlewares.use(handler),
  };
}

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
  plugins: [preact(), woff2Only(), fixtureImages(), cspMeta()],
  build: { target: 'es2022', sourcemap: false },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
});
