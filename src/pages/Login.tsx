// 入口（SPEC §7.1）：見出し、一言の説明、合言葉の入力欄、ボタンだけ
import { useState } from 'preact/hooks';
import site from '../../config/site.json' with { type: 'json' };
import { navigate } from '../lib/router.ts';
import { login } from '../lib/session.ts';

export function LoginPage({ next }: { next: string }) {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: Event): Promise<void> => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const ok = await login(pw);
      if (ok) navigate(next || '/timeline', { replace: true });
      else setError('合言葉が違います');
    } catch {
      setError('読み込みに失敗しました。通信状態を確認して、もう一度お試しください');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main class="gate">
      <form class="gate-card" onSubmit={submit}>
        <h1 class="gate-h1">{site.title}</h1>
        <p class="gate-lead">会員・OB/OG・村の関係者で共有する写真と資料です。合言葉を入れてください。</p>
        <label class="gate-label" for="pw">
          合言葉
        </label>
        <input id="pw" class="gate-input" type="password" autocomplete="current-password" value={pw} onInput={(e) => setPw((e.target as HTMLInputElement).value)} required />
        {error ? (
          <p class="gate-error" role="alert">
            {error}
          </p>
        ) : null}
        <button class="btn" type="submit" disabled={busy}>
          {busy ? '確認しています…' : 'アーカイブに入る'}
        </button>
      </form>
    </main>
  );
}
