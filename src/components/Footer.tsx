import { useEffect, useState } from 'preact/hooks';
import site from '../../config/site.json' with { type: 'json' };
import { getManifest } from '../lib/data.ts';
import { href } from '../lib/router.ts';

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export function Footer() {
  const [builtAt, setBuiltAt] = useState('');
  useEffect(() => {
    getManifest().then((m) => setBuiltAt(formatDate(m.builtAt))).catch(() => {});
  }, []);
  return (
    <footer class="foot">
      <div class="foot-in">
        <a href={site.officialSite} target="_blank" rel="noopener noreferrer">
          公式サイト
        </a>
        {site.contact ? <span>問い合わせ：{site.contact}</span> : null}
        {builtAt ? <span>最終更新：{builtAt}</span> : null}
        <a href={href('/report')}>取り込みレポート</a>
      </div>
    </footer>
  );
}
