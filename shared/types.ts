// docs/SPEC.md §6 のデータ形式。取り込み側（scripts/ingest）とアプリ側（src）で共有する。

/** '1990' | '1970s'（年代だけ分かる）| 'unknown'（年代も分からない） */
export type YearKey = string;

/** id は Drive のファイル ID、rk は resourceKey */
export interface PhotoRef {
  id: string;
  rk?: string;
  w?: number;
  h?: number;
}

export interface Photo extends PhotoRef {
  bytes?: number;
  mime: string;
  month?: number;
  day?: number;
  caption?: string;
  spot?: string;
}

/** 年表のトップ用。写真のない年は count: 0 で cover なし */
export interface YearEntry {
  yearKey: YearKey;
  count: number;
  cover?: PhotoRef;
  hasNote?: boolean;
}

export interface Era {
  name: string;
  from: number;
  to: number;
}

export interface Index {
  v: number;
  builtAt: string;
  /** 表示する順：1966, 1967, …, 1979, '1970s', 1980, …, 'unknown' */
  years: YearEntry[];
  /** config/eras.json から。空でよい */
  eras: Era[];
}

/** label が空ならカテゴリ名を見出しにする */
export interface EventData {
  category: string;
  label: string;
  description?: string;
  photos: Photo[];
}

/** note は年フォルダの「説明」 */
export interface YearData {
  yearKey: YearKey;
  note?: string;
  events: EventData[];
}

/** x, y は画像に対する % */
export interface Spot {
  id: string;
  name: string;
  kana?: string;
  category: string;
  x: number;
  y: number;
  description: string;
  photos: Photo[];
}

export interface SpotsData {
  spots: Spot[];
}

// ---- 設定ファイル（config/）の形 ----

export interface SpotConfig {
  id: string;
  name: string;
  aliases?: string[];
  kana?: string;
  category: string;
  x: number;
  y: number;
  description: string;
}

export interface EventsConfig {
  categories: string[];
  rules: { includes: string[]; category: string }[];
  fallback: string;
}

// ---- 取り込みレポート（§7.6）----

export type WarningCode =
  | 'NO_YEAR'
  | 'NO_EVENT_FOLDER'
  | 'YEAR_MISMATCH'
  | 'NESTED_EVENT'
  | 'BAD_YEAR_NAME'
  | 'LOOKS_LIKE_COPY'
  | 'SHORTCUT'
  | 'DUPLICATE'
  | 'MULTIPLE_COVERS'
  | 'UNKNOWN_SPOT'
  | 'FILE_AT_MAP_ROOT'
  | 'SPOT_WITHOUT_PHOTOS';

export interface Warning {
  code: WarningCode;
  path: string;
  count: number;
}

export type CoverMode = 'named' | 'auto' | 'none';

export interface ReportYear {
  yearKey: YearKey;
  count: number;
  cover: CoverMode;
  hasNote: boolean;
  events: { label: string; category: string; count: number }[];
}

export interface Report {
  v: number;
  builtAt: string;
  photoCount: number;
  years: ReportYear[];
  map: { spotId: string; name: string; count: number }[];
  warnings: Warning[];
  /** 対象外ファイルの種類（mimeType）別の件数 */
  excluded: Record<string, number>;
}

// ---- Drive の一覧（files.list の応答を平らに並べたもの。フィクスチャも同じ形）----

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  description?: string;
  size?: string;
  md5Checksum?: string;
  resourceKey?: string;
  createdTime?: string;
  shortcutDetails?: { targetId?: string; targetMimeType?: string };
  imageMediaMetadata?: { width?: number; height?: number; rotation?: number; time?: string };
}

export interface Listing {
  v: 1;
  fetchedAt: string;
  archiveRootId: string;
  mapRootId: string;
  files: DriveFile[];
}

export const FOLDER_MIME = 'application/vnd.google-apps.folder';
export const SHORTCUT_MIME = 'application/vnd.google-apps.shortcut';
