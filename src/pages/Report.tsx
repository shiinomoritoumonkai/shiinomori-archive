// 取り込みレポート（SPEC §7.6）
import { useEffect, useState } from 'preact/hooks';
import type { Report } from '../../shared/types.ts';
import { yearLabel } from '../../shared/wareki.ts';
import { getReport } from '../lib/data.ts';

const COVER_LABEL = { named: '指定（表紙）', auto: '自動', none: '—' } as const;

export function ReportPage({ cryptoKey }: { cryptoKey: CryptoKey }) {
  const [report, setReport] = useState<Report | undefined>();
  const [error, setError] = useState('');
  useEffect(() => {
    getReport(cryptoKey).then(setReport, () => setError('レポートを読み込めませんでした。再読み込みしてください'));
  }, [cryptoKey]);

  if (error) return <main class="page-plain"><p>{error}</p></main>;
  if (!report) return <main class="page-plain"><p>読み込んでいます…</p></main>;

  const built = new Date(report.builtAt);
  const warningTotal = report.warnings.reduce((a, w) => a + w.count, 0);
  return (
    <main class="page-plain report">
      <h1 class="h1">取り込みレポート</h1>
      <dl class="report-summary">
        <div>
          <dt>取り込んだ日時</dt>
          <dd>{built.toLocaleString('ja-JP')}</dd>
        </div>
        <div>
          <dt>写真の枚数</dt>
          <dd>{report.photoCount.toLocaleString('ja-JP')} 枚</dd>
        </div>
        <div>
          <dt>警告</dt>
          <dd>{warningTotal} 件</dd>
        </div>
      </dl>

      <h2 class="h2">年ごとのイベント</h2>
      <div class="table-wrap"><table class="report-table">
        <thead>
          <tr>
            <th>年</th>
            <th>イベント</th>
            <th>カテゴリ</th>
            <th class="num">枚数</th>
            <th>表紙</th>
          </tr>
        </thead>
        <tbody>
          {report.years.map((y) =>
            y.events.length === 0 ? (
              <tr key={y.yearKey}>
                <th scope="row">{yearLabel(y.yearKey).big}</th>
                <td colSpan={3}>{y.hasNote ? '説明のみ' : '—'}</td>
                <td>{COVER_LABEL[y.cover]}</td>
              </tr>
            ) : (
              y.events.map((e, i) => (
                <tr key={`${y.yearKey}-${i}`}>
                  {i === 0 ? (
                    <th scope="row" rowSpan={y.events.length}>
                      {yearLabel(y.yearKey).big}
                      {y.hasNote ? <span class="muted">（説明あり）</span> : null}
                    </th>
                  ) : null}
                  <td>{e.label || <span class="muted">（イベント名なし）</span>}</td>
                  <td>{e.category}</td>
                  <td class="num">{e.count}</td>
                  {i === 0 ? <td rowSpan={y.events.length}>{COVER_LABEL[y.cover]}</td> : null}
                </tr>
              ))
            ),
          )}
        </tbody>
      </table></div>

      <h2 class="h2">マップ</h2>
      <div class="table-wrap"><table class="report-table">
        <thead>
          <tr>
            <th>スポット</th>
            <th class="num">枚数</th>
          </tr>
        </thead>
        <tbody>
          {report.map.map((s) => (
            <tr key={s.spotId}>
              <td>{s.name}</td>
              <td class="num">{s.count}</td>
            </tr>
          ))}
        </tbody>
      </table></div>

      <h2 class="h2">警告</h2>
      {report.warnings.length === 0 ? (
        <p>警告はありません。</p>
      ) : (
        <div class="table-wrap"><table class="report-table">
          <thead>
            <tr>
              <th>コード</th>
              <th>フォルダ</th>
              <th class="num">件数</th>
            </tr>
          </thead>
          <tbody>
            {report.warnings.map((w, i) => (
              <tr key={i}>
                <td>
                  <code>{w.code}</code>
                </td>
                <td>{w.path || '/'}</td>
                <td class="num">{w.count}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}

      <h2 class="h2">対象外のファイル</h2>
      {Object.keys(report.excluded).length === 0 ? (
        <p>対象外のファイルはありません。</p>
      ) : (
        <ul>
          {Object.entries(report.excluded).map(([k, v]) => (
            <li key={k}>
              {k}：{v} 件
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
