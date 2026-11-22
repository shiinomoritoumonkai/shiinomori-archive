// M3・M4 で置き換える仮の画面
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <main class="page-plain">
      <h1 class="h1">{title}</h1>
      <p>この画面は準備中です。</p>
    </main>
  );
}
