// 画像の読み込みキュー（SPEC §9）：同時に N 本まで。失敗は 1 → 3 → 8 秒で再試行し、次に予備の URL、最後に失敗を返す。
// 画面に近いものから読む（priority が小さいほど先）。
import site from '../../config/site.json' with { type: 'json' };
import type { PhotoRef } from '../../shared/types.ts';
import { photoUrl, type PhotoSize } from './photoUrl.ts';

export interface LoadResult {
  url: string;
  naturalWidth: number;
  naturalHeight: number;
}

interface Task {
  ref: PhotoRef;
  size: PhotoSize;
  priority: () => number;
  resolve: (r: LoadResult) => void;
  reject: (e: Error) => void;
  cancelled: boolean;
}

const CONCURRENCY = site.images.concurrency;
const RETRY_DELAYS = site.images.retryDelaysMs;
const queue: Task[] = [];
const done = new Map<string, LoadResult>();
let active = 0;

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function tryLoad(url: string): Promise<LoadResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => resolve({ url, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
    img.onerror = () => reject(new Error('load failed'));
    img.src = url;
  });
}

async function run(task: Task): Promise<void> {
  const primary = photoUrl(task.ref, task.size, 'primary');
  const fallback = photoUrl(task.ref, task.size, 'fallback');
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    if (task.cancelled) return;
    try {
      const r = await tryLoad(primary);
      done.set(keyOf(task), r);
      task.resolve(r);
      return;
    } catch {
      const delay = RETRY_DELAYS[attempt];
      if (delay !== undefined) await sleep(delay);
    }
  }
  if (task.cancelled) return;
  try {
    const r = await tryLoad(fallback);
    done.set(keyOf(task), r);
    task.resolve(r);
  } catch {
    task.reject(new Error('image unavailable'));
  }
}

function keyOf(t: { ref: PhotoRef; size: PhotoSize }): string {
  return `${t.ref.id}|${t.size}`;
}

function pump(): void {
  while (active < CONCURRENCY && queue.length > 0) {
    let best = 0;
    let bestP = Infinity;
    for (let i = 0; i < queue.length; i++) {
      const t = queue[i]!;
      if (t.cancelled) {
        queue.splice(i, 1);
        i--;
        continue;
      }
      const p = t.priority();
      if (p < bestP) {
        bestP = p;
        best = i;
      }
    }
    const task = queue.splice(best, 1)[0];
    if (!task) return;
    active++;
    run(task).finally(() => {
      active--;
      pump();
    });
  }
}

export interface Handle {
  promise: Promise<LoadResult>;
  cancel: () => void;
}

/** 読み込みを予約する。priority は呼ばれるたびに評価される（画面からの距離など） */
export function loadImage(ref: PhotoRef, size: PhotoSize, priority: () => number = () => 0): Handle {
  const k = keyOf({ ref, size });
  const hit = done.get(k);
  if (hit) return { promise: Promise.resolve(hit), cancel: () => {} };
  let task!: Task;
  const promise = new Promise<LoadResult>((resolve, reject) => {
    task = { ref, size, priority, resolve, reject, cancelled: false };
  });
  // キャンセルの reject を「未処理の例外」にしない（先読みなど、結果を待たない呼び出しがある）
  promise.catch(() => {});
  queue.push(task);
  pump();
  return {
    promise,
    cancel: () => {
      task.cancelled = true;
      task.reject(new Error('cancelled'));
    },
  };
}

/** テスト・デバッグ用 */
export function queueStats(): { active: number; queued: number; loaded: number } {
  return { active, queued: queue.length, loaded: done.size };
}
