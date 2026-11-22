// ビューアの開閉を履歴に積む（SPEC §7.5：スマホの「戻る」で閉じる）。現在のハッシュの ?p=<index> で表す
import { navigate, type Route } from './router.ts';

let pushed = false;

function withParam(route: Route, key: string, value: string | undefined): string {
  const params = new URLSearchParams(route.params);
  if (value === undefined) params.delete(key);
  else params.set(key, value);
  const q = params.toString();
  return `${route.path}${q ? `?${q}` : ''}`;
}

export function viewerIndex(route: Route): number | undefined {
  const p = route.params.get('p');
  if (p === null || p === '') return undefined;
  const n = Number(p);
  return Number.isInteger(n) && n >= 0 ? n : undefined;
}

export function openViewer(route: Route, index: number): void {
  pushed = true;
  navigate(withParam(route, 'p', String(index)));
}

export function setViewerIndex(route: Route, index: number): void {
  navigate(withParam(route, 'p', String(index)), { replace: true });
}

export function closeViewer(route: Route): void {
  if (pushed) {
    pushed = false;
    history.back();
  } else {
    navigate(withParam(route, 'p', undefined), { replace: true });
  }
}
