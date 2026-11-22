// 西暦 → 和暦（年表の小さなラベル用）
export function wareki(year: number): string {
  if (year >= 2019) return `令和${era(year - 2018)}年`;
  if (year >= 1989) return `平成${era(year - 1988)}年`;
  if (year >= 1926) return `昭和${era(year - 1925)}年`;
  if (year >= 1912) return `大正${era(year - 1911)}年`;
  return `明治${era(year - 1867)}年`;
}

function era(n: number): string {
  return n === 1 ? '元' : String(n);
}

export interface YearLabel {
  /** 小さなラベル：和暦、または「年不明」 */
  small: string;
  /** 大きな見出し：西暦、「1970年代」、「年代不明」 */
  big: string;
  /** 大きな見出しが長い（年代・年代不明） */
  long: boolean;
  /** 索引用の年代（年代不明は undefined） */
  decade?: number;
}

export function yearLabel(yearKey: string): YearLabel {
  if (/^\d{4}$/.test(yearKey)) {
    const y = Number(yearKey);
    return { small: wareki(y), big: yearKey, long: false, decade: Math.floor(y / 10) * 10 };
  }
  const m = /^(\d{4})s$/.exec(yearKey);
  if (m) return { small: '年不明', big: `${m[1]}年代`, long: true, decade: Number(m[1]) };
  return { small: '年不明', big: '年代不明', long: true };
}
