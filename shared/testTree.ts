// テストとフィクスチャで使う、フォルダ木を手早く書くための補助
import type { FolderNode } from './tree.ts';
import { FOLDER_MIME, SHORTCUT_MIME, type DriveFile } from './types.ts';

let seq = 0;
export function resetIds(): void {
  seq = 0;
}
export function nextId(prefix = 'f'): string {
  seq += 1;
  return `${prefix}${String(seq).padStart(6, '0')}`;
}

export interface FileSpec {
  name?: string;
  mime?: string;
  w?: number;
  h?: number;
  time?: string;
  md5?: string;
  description?: string;
  size?: number;
  shortcut?: boolean;
  rotation?: number;
}

export function file(spec: FileSpec = {}): DriveFile {
  const id = nextId();
  const f: DriveFile = { id, name: spec.name ?? `IMG_${id}.jpg`, mimeType: spec.shortcut ? SHORTCUT_MIME : (spec.mime ?? 'image/jpeg') };
  if (spec.description) f.description = spec.description;
  if (spec.size) f.size = String(spec.size);
  if (spec.md5) f.md5Checksum = spec.md5;
  const w = spec.w ?? 4000;
  const h = spec.h ?? 3000;
  if (!spec.shortcut && f.mimeType.startsWith('image/') && (spec.w !== 0)) {
    f.imageMediaMetadata = { width: w, height: h, ...(spec.rotation !== undefined ? { rotation: spec.rotation } : {}), ...(spec.time ? { time: spec.time } : {}) };
  }
  return f;
}

/** 幅 > 高さ の写真 */
export function landscape(spec: FileSpec = {}): DriveFile {
  return file({ w: 4000, h: 3000, ...spec });
}
/** 幅 < 高さ の写真 */
export function portrait(spec: FileSpec = {}): DriveFile {
  return file({ w: 3000, h: 4000, ...spec });
}
/** 寸法不明の写真 */
export function nodims(spec: FileSpec = {}): DriveFile {
  const f = file(spec);
  delete f.imageMediaMetadata;
  return f;
}
export function photos(n: number, spec: FileSpec = {}): DriveFile[] {
  return Array.from({ length: n }, () => file(spec));
}

export function folder(name: string, children: (FolderNode | DriveFile)[] = [], description?: string): FolderNode {
  const node: FolderNode = { id: nextId('d'), name, folders: [], files: [] };
  if (description) node.description = description;
  for (const c of children) {
    if ('folders' in c) node.folders.push(c);
    else node.files.push(c);
  }
  return node;
}

/** 木を Drive の平らな一覧（parents 付き）に戻す（フィクスチャ用） */
export function flatten(root: FolderNode): DriveFile[] {
  const out: DriveFile[] = [];
  const visit = (n: FolderNode): void => {
    for (const f of n.files) out.push({ ...f, parents: [n.id] });
    for (const c of n.folders) {
      const d: DriveFile = { id: c.id, name: c.name, mimeType: FOLDER_MIME, parents: [n.id] };
      if (c.description) d.description = c.description;
      out.push(d);
      visit(c);
    }
  };
  visit(root);
  return out;
}
