// Drive の平らな一覧（parents 付き）を、ルートごとのフォルダ木にする
import { FOLDER_MIME, type DriveFile } from './types.ts';

export interface FolderNode {
  id: string;
  name: string;
  description?: string;
  folders: FolderNode[];
  files: DriveFile[];
}

export function buildTree(rootId: string, rootName: string, files: DriveFile[]): FolderNode {
  const byParent = new Map<string, DriveFile[]>();
  for (const f of files) {
    for (const p of f.parents ?? []) {
      const list = byParent.get(p);
      if (list) list.push(f);
      else byParent.set(p, [f]);
    }
  }
  const seen = new Set<string>();
  const build = (id: string, name: string, description?: string): FolderNode => {
    const node: FolderNode = { id, name, folders: [], files: [], ...(description ? { description } : {}) };
    const children = byParent.get(id) ?? [];
    for (const c of children) {
      if (c.mimeType === FOLDER_MIME) {
        if (seen.has(c.id)) continue; // 同じフォルダが 2 か所に見えるときは最初だけ
        seen.add(c.id);
        node.folders.push(build(c.id, c.name, c.description));
      } else {
        node.files.push(c);
      }
    }
    return node;
  };
  return build(rootId, rootName);
}
