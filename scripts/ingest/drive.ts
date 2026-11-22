// Drive API の読み取り（SPEC §5.1）。サービスアカウント、読み取り専用スコープ、フォルダ単位の files.list を並列で。
import { auth, drive, type drive_v3 } from '@googleapis/drive';
import { FOLDER_MIME, type DriveFile, type Listing } from '../../shared/types.ts';

export const DEFAULT_SCOPE = 'https://www.googleapis.com/auth/drive.metadata.readonly';
const FIELDS = 'nextPageToken, files(id, name, mimeType, parents, description, size, md5Checksum, resourceKey, createdTime, shortcutDetails, imageMediaMetadata(width, height, rotation, time))';

export interface DriveEnv {
  keyB64: string;
  archiveRootId: string;
  mapRootId: string;
  scope?: string;
}

export function readDriveEnv(env: NodeJS.ProcessEnv = process.env): DriveEnv {
  const missing = ['GOOGLE_SERVICE_ACCOUNT_KEY_B64', 'DRIVE_ARCHIVE_ROOT_ID', 'DRIVE_MAP_ROOT_ID'].filter((k) => !env[k]);
  if (missing.length) throw new Error(`環境変数が足りません: ${missing.join(', ')}（.env か GitHub Secrets を確認）`);
  return {
    keyB64: env.GOOGLE_SERVICE_ACCOUNT_KEY_B64!,
    archiveRootId: env.DRIVE_ARCHIVE_ROOT_ID!,
    mapRootId: env.DRIVE_MAP_ROOT_ID!,
    ...(env.DRIVE_SCOPE ? { scope: env.DRIVE_SCOPE } : {}),
  };
}

export function createClient(env: DriveEnv): drive_v3.Drive {
  const creds = JSON.parse(Buffer.from(env.keyB64, 'base64').toString('utf8')) as { client_email: string; private_key: string };
  const jwt = new auth.JWT({ email: creds.client_email, key: creds.private_key, scopes: [env.scope ?? DEFAULT_SCOPE] });
  return drive({ version: 'v3', auth: jwt });
}

export interface ListOptions {
  concurrency?: number;
  onProgress?: (done: number, queued: number, files: number) => void;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const status = (e as { status?: number; code?: number }).status ?? (e as { code?: number }).code;
      const retryable = status === 429 || (typeof status === 'number' && status >= 500);
      if (!retryable || attempt >= delays.length) throw new Error(`Drive API error (${label}): status=${status ?? 'unknown'}`, { cause: e });
      await sleep(delays[attempt]! + Math.random() * 500);
    }
  }
}

/** 1 つのフォルダの直下を、nextPageToken がなくなるまで読む */
export async function listFolder(client: drive_v3.Drive, folderId: string): Promise<DriveFile[]> {
  const out: DriveFile[] = [];
  let pageToken: string | undefined;
  do {
    const res = await withRetry(
      () =>
        client.files.list({
          q: `'${folderId}' in parents and trashed = false`,
          pageSize: 1000,
          fields: FIELDS,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
          ...(pageToken ? { pageToken } : {}),
        }),
      'files.list',
    );
    for (const f of res.data.files ?? []) {
      if (!f.id || !f.name || !f.mimeType) continue;
      const d: DriveFile = { id: f.id, name: f.name, mimeType: f.mimeType, parents: [folderId] };
      if (f.description) d.description = f.description;
      if (f.size) d.size = f.size;
      if (f.md5Checksum) d.md5Checksum = f.md5Checksum;
      if (f.resourceKey) d.resourceKey = f.resourceKey;
      if (f.createdTime) d.createdTime = f.createdTime;
      if (f.shortcutDetails) d.shortcutDetails = { ...(f.shortcutDetails.targetId ? { targetId: f.shortcutDetails.targetId } : {}), ...(f.shortcutDetails.targetMimeType ? { targetMimeType: f.shortcutDetails.targetMimeType } : {}) };
      const m = f.imageMediaMetadata;
      if (m && (m.width || m.height || m.time || m.rotation !== undefined)) {
        d.imageMediaMetadata = {
          ...(m.width ? { width: m.width } : {}),
          ...(m.height ? { height: m.height } : {}),
          ...(typeof m.rotation === 'number' ? { rotation: m.rotation } : {}),
          ...(m.time ? { time: m.time } : {}),
        };
      }
      out.push(d);
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return out;
}

/** ルート以下を幅優先・並列で走査する */
export async function listRecursive(client: drive_v3.Drive, rootId: string, opts: ListOptions = {}): Promise<DriveFile[]> {
  const concurrency = opts.concurrency ?? 6;
  const queue: string[] = [rootId];
  const files: DriveFile[] = [];
  const seen = new Set<string>([rootId]);
  let done = 0;
  let active = 0;
  let failure: unknown;

  await new Promise<void>((resolve, reject) => {
    const pump = (): void => {
      if (failure) return;
      if (queue.length === 0 && active === 0) {
        resolve();
        return;
      }
      while (active < concurrency && queue.length > 0) {
        const id = queue.shift()!;
        active++;
        listFolder(client, id)
          .then((list) => {
            for (const f of list) {
              files.push(f);
              if (f.mimeType === FOLDER_MIME && !seen.has(f.id)) {
                seen.add(f.id);
                queue.push(f.id);
              }
            }
            done++;
            opts.onProgress?.(done, queue.length, files.length);
          })
          .catch((e: unknown) => {
            failure = e;
            reject(e);
          })
          .finally(() => {
            active--;
            pump();
          });
      }
    };
    pump();
  });
  return files;
}

export async function fetchListing(env: DriveEnv, opts: ListOptions = {}): Promise<Listing> {
  const client = createClient(env);
  const [archive, map] = await Promise.all([listRecursive(client, env.archiveRootId, opts), listRecursive(client, env.mapRootId, opts)]);
  return { v: 1, fetchedAt: new Date().toISOString(), archiveRootId: env.archiveRootId, mapRootId: env.mapRootId, files: [...archive, ...map] };
}
