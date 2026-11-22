import { useEffect, useState } from 'preact/hooks';
import { Footer } from './components/Footer.tsx';
import { Header } from './components/Header.tsx';
import { navigate, useRoute } from './lib/router.ts';
import { getSession, restoreSession, subscribeSession, type SessionState } from './lib/session.ts';
import { LoginPage } from './pages/Login.tsx';
import { MapPage } from './pages/Map.tsx';
import { PlaceholderPage } from './pages/Placeholder.tsx';
import { ReportPage } from './pages/Report.tsx';

function useSession(): SessionState {
  const [s, setS] = useState(getSession);
  useEffect(() => subscribeSession(setS), []);
  return s;
}

export function App() {
  const route = useRoute();
  const session = useSession();

  useEffect(() => {
    if (session.status === 'loading') void restoreSession();
  }, []);

  // 合言葉なしで見られるのは入口だけ（SPEC §3.4 の 5）
  useEffect(() => {
    if (session.status === 'out' && route.path !== '/login') {
      const next = route.path === '/' ? '' : `${route.path}${route.params.size ? `?${route.params}` : ''}`;
      navigate(`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`, { replace: true });
    }
    if (session.status === 'in' && (route.path === '/login' || route.path === '/')) {
      navigate(route.params.get('next') || '/timeline', { replace: true });
    }
  }, [session.status, route.path]);

  if (session.status === 'loading') return <main class="gate" aria-busy="true" />;
  if (session.status === 'out') return route.path === '/login' ? <LoginPage next={route.params.get('next') ?? ''} /> : <main class="gate" />;

  const key = session.key;
  const [head] = route.segments;
  let page;
  let current: 'map' | 'timeline' | 'other' = 'other';
  if (head === 'map') {
    current = 'map';
    page = <MapPage cryptoKey={key} route={route} />;
  } else if (head === 'timeline') {
    current = 'timeline';
    page = <PlaceholderPage title="年表" />;
  } else if (head === 'report') {
    page = <ReportPage cryptoKey={key} />;
  } else {
    page = (
      <main class="page-plain">
        <h1 class="h1">ページが見つかりません</h1>
        <p>上のタブから「マップ」か「年表」を開いてください。</p>
      </main>
    );
  }
  return (
    <>
      <Header current={current} />
      {page}
      <Footer />
    </>
  );
}
