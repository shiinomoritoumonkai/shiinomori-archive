// docs/SPEC.md §4.2 の 1〜3：名前の正規化と、フォルダ名から年・イベント名を読む

/** NFKC で正規化し、前後の空白を除き、連続する空白を 1 つにする */
export function normalizeName(name: string): string {
  return name.normalize('NFKC').replace(/\s+/g, ' ').trim();
}

/** 名前が _ か . で始まるものは読まない */
export function isHiddenName(name: string): boolean {
  const n = normalizeName(name);
  return n.startsWith('_') || n.startsWith('.');
}

export interface ParsedName {
  /** 正規化後の名前 */
  name: string;
  /** 1990 | '1970s' | 'unknown'。年が読めなければ undefined */
  yearKey?: string;
  /** 年が 4 桁で確定しているとき */
  year?: number;
  /** 年のあとに続くイベント名（なければ undefined） */
  event?: string;
  /** 先頭が 4 桁の数字なのに年として読めない */
  badYear: boolean;
}

export interface YearRange {
  min: number;
  max: number;
}

const SEP = /^[_\-\s]+/;

/** 名前の先頭から年（YYYY年 / YYYY年度 / YYYY年代 / YYYY / 年不明 / 年代不明）とイベント名を読む */
export function parseFolderName(raw: string, range: YearRange): ParsedName {
  const name = normalizeName(raw);
  const base: ParsedName = { name, badYear: false };

  const unknown = /^(年代不明|年不明)(.*)$/.exec(name);
  if (unknown) {
    const rest = stripSeparators(unknown[2] ?? '');
    return { ...base, yearKey: 'unknown', ...(rest ? { event: rest } : {}) };
  }

  const m = /^(\d{4})(年代|年度|年)?(.*)$/.exec(name);
  if (!m) return base;
  const num = Number(m[1]);
  const suffix = m[2];
  const restRaw = m[3] ?? '';
  const inRange = num >= range.min && num <= range.max;

  if (suffix === '年代') {
    if (!inRange || num % 10 !== 0) return { ...base, badYear: true };
    const rest = stripSeparators(restRaw);
    const event = rest && !/^(年代不明|年不明)$/.test(rest) ? rest : undefined;
    return { ...base, yearKey: `${num}s`, ...(event ? { event } : {}) };
  }

  if (suffix === undefined) {
    // 直後が区切りか名前の終わりのときだけ年とみなす
    if (restRaw !== '' && !SEP.test(restRaw)) return { ...base, badYear: true };
  }
  if (!inRange) return { ...base, badYear: true };
  const rest = stripSeparators(restRaw);
  return { ...base, yearKey: String(num), year: num, ...(rest ? { event: rest } : {}) };
}

function stripSeparators(s: string): string {
  return s.replace(SEP, '').replace(/[_\-\s]+$/, '');
}

/** 名前の末尾が「のコピー」「(1)」「copy」など */
export function looksLikeCopy(raw: string): boolean {
  const name = normalizeName(raw);
  return /(のコピー|-\s*コピー|\bcopy(\s+\d+)?|\(\d+\))\s*$/i.test(name);
}

/** 名前（正規化後）が「表紙」で始まる写真は、年表のトップに出す 1 枚になる */
export function isCoverName(raw: string): boolean {
  return normalizeName(raw).startsWith('表紙');
}

/** 拡張子（小文字、ドットなし）。なければ '' */
export function extensionOf(raw: string): string {
  const m = /\.([A-Za-z0-9]+)$/.exec(raw.trim());
  return m ? (m[1] ?? '').toLowerCase() : '';
}
