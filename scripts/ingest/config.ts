// config/ の読み込み（取り込み側）
import { readFileSync } from 'node:fs';
import type { Era, EventsConfig, SpotConfig } from '../../shared/types.ts';
import type { PipelineConfig } from './pipeline.ts';

const root = new URL('../../', import.meta.url);

function readJson<T>(rel: string): T {
  return JSON.parse(readFileSync(new URL(rel, root), 'utf8')) as T;
}

export interface SiteConfig {
  title: string;
  minYear: number;
  minPhotos: number;
  mapPhotosPerSpot: number;
  imageMimeTypes: string[];
  imageExtensions: string[];
  images: { concurrency: number; widths: { tile: number; cover: number; viewer: number } };
}

export interface CryptoConfig {
  v: number;
  kdf: { name: string; hash: string; iterations: number; salt: string };
  cipher: string;
}

export function loadConfig(): { pipeline: PipelineConfig; site: SiteConfig; crypto: CryptoConfig } {
  const site = readJson<SiteConfig>('config/site.json');
  const crypto = readJson<CryptoConfig>('config/crypto.json');
  if (!crypto.kdf.salt) throw new Error('config/crypto.json の salt が空です。pnpm crypto:rotate --init を実行してください');
  const pipeline: PipelineConfig = {
    events: readJson<EventsConfig>('config/events.json'),
    spots: readJson<SpotConfig[]>('config/spots.json'),
    eras: readJson<Era[]>('config/eras.json'),
    site,
    version: crypto.v,
  };
  return { pipeline, site, crypto };
}
