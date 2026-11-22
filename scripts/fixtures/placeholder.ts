// フィクスチャ用の仮画像（空・山・手前の斜面だけの絵）。ID から決定的に作る
function rng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const SKIES = [['#DCE9F5', '#F6EEE6'], ['#8DBDE4', '#E4F1FA'], ['#F1CFA2', '#FBEFE0'], ['#C9D3DA', '#F0F3F5'], ['#B7D3E8', '#F3F6EE']];
const LANDS = [['#9DB89A', '#5F8A5B', '#3F6B45'], ['#A9C7A0', '#6FA05F', '#4B7B48'], ['#C9B27A', '#A98548', '#6E6A3E'], ['#B8C2B0', '#8A9A86', '#5D6F5E'], ['#9CC0B5', '#5E9A8B', '#3D7468']];

export function seedOf(id: string): number {
  let a = 7;
  for (const c of id) a = (a * 31 + c.charCodeAt(0)) >>> 0;
  return a;
}

/** 幅 w の SVG。portrait なら縦位置 */
export function placeholderSvg(id: string, w = 400, portrait = false): string {
  const r = rng(seedOf(id));
  const sky = SKIES[Math.floor(r() * SKIES.length)]!;
  const land = LANDS[Math.floor(r() * LANDS.length)]!;
  const W = 400;
  const H = portrait ? 533 : 300;
  const hill = (base: number, amp: number, col: string): string => {
    let d = `M0,${H} L0,${base}`;
    for (let x = 0; x < W; x += 80) d += ` Q${x + 40},${base - amp * (0.3 + r())} ${x + 80},${base - amp * 0.2 * r()}`;
    return `<path d="${d} L${W},${H}Z" fill="${col}"/>`;
  };
  const sun = r() < 0.5 ? `<circle cx="${60 + r() * 280}" cy="${50 + r() * 50}" r="${14 + r() * 10}" fill="#fff" opacity=".7"/>` : '';
  const h = Math.round((w * H) / W);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#s)"/>${sun}${hill(H * 0.57, 70, land[0]!)}${hill(H * 0.72, 55, land[1]!)}${hill(H * 0.87, 40, land[2]!)}<text x="8" y="${H - 8}" font-size="14" fill="#fff" opacity=".6">${id}</text></svg>`;
}
