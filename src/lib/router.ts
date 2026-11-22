// ハッシュ方式のルーター（SPEC §7。GitHub Pages には SPA 用のフォールバックがないため）
import { useEffect, useState } from 'preact/hooks';

export interface Route {
  path: string;
  params: URLSearchParams;
  /** path を '/' で割ったもの（先頭の空文字は除く） */
  segments: string[];
}

export function parseHash(hash: string = location.hash): Route {
  const raw = hash.replace(/^#/, '');
  const q = raw.indexOf('?');
  const path = (q === -1 ? raw : raw.slice(0, q)) || '/';
  const params = new URLSearchParams(q === -1 ? '' : raw.slice(q + 1));
  return { path, params, segments: path.split('/').filter(Boolean) };
}

export function navigate(to: string, opts: { replace?: boolean } = {}): void {
  const target = `#${to.startsWith('/') ? to : `/${to}`}`;
  if (opts.replace) {
    const url = new URL(location.href);
    url.hash = target;
    history.replaceState(history.state, '', url);
    dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    location.hash = target;
  }
}

export function href(to: string): string {
  return `#${to.startsWith('/') ? to : `/${to}`}`;
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash());
  useEffect(() => {
    const on = (): void => setRoute(parseHash());
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return route;
}
