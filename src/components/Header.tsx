import site from '../../config/site.json' with { type: 'json' };
import { href } from '../lib/router.ts';
import { logout } from '../lib/session.ts';

export function Header({ current }: { current: 'map' | 'timeline' | 'other' }) {
  return (
    <header class="top">
      <div class="top-in">
        <a class="site" href={href('/timeline')}>
          {site.title}
        </a>
        <nav class="tabs" aria-label="画面の切り替え">
          <a class="tab" href={href('/map')} aria-current={current === 'map' ? 'page' : undefined}>
            マップ
          </a>
          <a class="tab" href={href('/timeline')} aria-current={current === 'timeline' ? 'page' : undefined}>
            年表
          </a>
        </nav>
        <button class="out" type="button" onClick={logout}>
          ログアウト
        </button>
      </div>
    </header>
  );
}
