// 年表のトップ（SPEC §7.3）：1 年につき写真 1 枚。文字は西暦と和暦だけ
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Index, YearEntry } from '../../shared/types.ts';
import { yearLabel } from '../../shared/wareki.ts';
import { PhotoImg } from '../components/PhotoImg.tsx';
import { getIndex } from '../lib/data.ts';
import { href } from '../lib/router.ts';

const SCROLL_KEY = 'shiinomori.timeline.scroll';

export function rememberTimelineScroll(): void {
  try {
    sessionStorage.setItem(SCROLL_KEY, String(Math.round(scrollY)));
  } catch {
    /* ignore */
  }
}

interface Row {
  entry: YearEntry;
  label: ReturnType<typeof yearLabel>;
  /** 写真のある行だけを数えた左右の番号 */
  side?: 'r' | 'l';
  era?: string;
}

function buildRows(index: Index): Row[] {
  const rows: Row[] = [];
  let n = 0;
  const eraStart = new Map<number, string>();
  for (const e of index.eras) eraStart.set(e.from, e.name);
  for (const entry of index.years) {
    const label = yearLabel(entry.yearKey);
    const row: Row = { entry, label };
    const era = /^\d{4}$/.test(entry.yearKey) ? eraStart.get(Number(entry.yearKey)) : undefined;
    if (era) row.era = era;
    if (entry.cover) row.side = n++ % 2 === 0 ? 'r' : 'l';
    rows.push(row);
  }
  return rows;
}

export function TimelinePage({ cryptoKey }: { cryptoKey: CryptoKey }) {
  const [index, setIndex] = useState<Index | undefined>();
  const [error, setError] = useState('');
  const [nowDecade, setNowDecade] = useState<number | undefined>();
  const listRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    getIndex(cryptoKey).then(setIndex, () => setError('年表のデータを読み込めませんでした。再読み込みしてください'));
  }, [cryptoKey]);

  const rows = useMemo(() => (index ? buildRows(index) : []), [index]);
  const decades = useMemo(() => [...new Set(rows.map((r) => r.label.decade).filter((d): d is number => d !== undefined))], [rows]);

  // 年のページから戻ったときは、開く前のスクロール位置に戻す
  useEffect(() => {
    if (!index) return;
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved) {
      sessionStorage.removeItem(SCROLL_KEY);
      requestAnimationFrame(() => scrollTo({ top: Number(saved), behavior: 'auto' }));
    }
  }, [index]);

  // いまの位置の年代
  useEffect(() => {
    const list = listRef.current;
    if (!list || !index) return;
    const io = new IntersectionObserver(
      (ents) => {
        for (const en of ents) {
          const d = (en.target as HTMLElement).dataset.decade;
          if (en.isIntersecting && d) setNowDecade(Number(d));
        }
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    for (const el of list.querySelectorAll<HTMLElement>('[data-decade]')) io.observe(el);
    return () => io.disconnect();
  }, [index]);

  const jump = (decade: number): void => {
    const first = listRef.current?.querySelector<HTMLElement>(`[data-decade="${decade}"]`);
    if (!first) return;
    const bar = navRef.current;
    const horizontal = matchMedia('(max-width: 1099px)').matches;
    const offset = horizontal && bar ? bar.offsetHeight + 12 : 24;
    scrollTo({ top: first.getBoundingClientRect().top + scrollY - offset, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };

  if (error) return <main class="page-plain"><p>{error}</p></main>;
  if (!index) return <main class="page-plain" aria-busy="true"><p>読み込んでいます…</p></main>;

  const current = nowDecade ?? decades[0];
  return (
    <div class="tl-page">
      <nav class="decades" aria-label="年代へ移動" ref={navRef}>
        {decades.map((d) => (
          <button type="button" key={d} class={current === d ? 'is-now' : ''} onClick={() => jump(d)} aria-current={current === d ? 'location' : undefined}>
            {d}年代
          </button>
        ))}
      </nav>
      <main class="tl-main">
        <h1 class="h1">年表</h1>
        <div class="tl" ref={listRef}>
          {rows.map((r) => {
            const { entry, label } = r;
            const decadeAttr = label.decade !== undefined ? String(label.decade) : undefined;
            const linked = !!entry.cover || !!entry.hasNote;
            return (
              <>
                {r.era ? (
                  <p class="era" key={`era-${entry.yearKey}`}>
                    {r.era}
                  </p>
                ) : null}
                {entry.cover ? (
                  <a key={entry.yearKey} class={`yr side-${r.side}`} href={href(`/timeline/${entry.yearKey}`)} data-decade={decadeAttr} onClick={rememberTimelineScroll}>
                    <PhotoImg photo={entry.cover} size="cover" alt="" aspect="5 / 4" class="yr-ph" />
                    <span class="dot" aria-hidden="true" />
                    <span class="lab">
                      <span class="wa">{label.small}</span>
                      <span class={`y${label.long ? ' long' : ''}`}>{label.big}</span>
                      <span class="sr-only">{label.long ? 'の写真を見る' : '年の写真を見る'}</span>
                    </span>
                  </a>
                ) : linked ? (
                  <a key={entry.yearKey} class="yr empty" href={href(`/timeline/${entry.yearKey}`)} data-decade={decadeAttr} onClick={rememberTimelineScroll}>
                    <span class="dot" aria-hidden="true" />
                    <span class="lab">
                      <span class="y">{label.big}</span>
                      <span class="sr-only">年の説明を見る</span>
                    </span>
                  </a>
                ) : (
                  <div key={entry.yearKey} class="yr empty" data-decade={decadeAttr}>
                    <span class="dot" aria-hidden="true" />
                    <span class="lab">
                      <span class="y">{label.big}</span>
                    </span>
                  </div>
                )}
              </>
            );
          })}
        </div>
      </main>
    </div>
  );
}
