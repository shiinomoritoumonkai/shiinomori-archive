// 一覧（Listing）→ §4 の振り分け → §6 のデータ（Index / YearData / Spots / Report）
import { finalizeYear, orderYearKeys, walkArchive, type ArchiveOptions } from '../../shared/archive.ts';
import { walkMap } from '../../shared/map.ts';
import { buildTree } from '../../shared/tree.ts';
import type { Era, EventsConfig, Index, Listing, Report, ReportYear, SpotConfig, SpotsData, Warning, YearData, YearEntry, YearKey } from '../../shared/types.ts';

export interface PipelineConfig {
  events: EventsConfig;
  spots: SpotConfig[];
  eras: Era[];
  site: { minYear: number; mapPhotosPerSpot: number; imageMimeTypes: string[]; imageExtensions: string[] };
  version: number;
}

export interface PipelineOutput {
  index: Index;
  years: Map<YearKey, YearData>;
  spots: SpotsData;
  report: Report;
  warnings: Warning[];
  photoCount: number;
}

export function runPipeline(listing: Listing, cfg: PipelineConfig, now = new Date()): PipelineOutput {
  const thisYear = now.getFullYear();
  const archiveOpts: ArchiveOptions = {
    events: cfg.events,
    spots: cfg.spots,
    yearRange: { min: cfg.site.minYear, max: thisYear + 1 },
    imageMimeTypes: cfg.site.imageMimeTypes,
    imageExtensions: cfg.site.imageExtensions,
  };
  const archiveTree = buildTree(listing.archiveRootId, '', listing.files);
  const mapTree = buildTree(listing.mapRootId, '', listing.files);

  const archive = walkArchive(archiveTree, archiveOpts);
  const map = walkMap(mapTree, { spots: cfg.spots, photosPerSpot: cfg.site.mapPhotosPerSpot, imageMimeTypes: cfg.site.imageMimeTypes, imageExtensions: cfg.site.imageExtensions });

  const warnings: Warning[] = [...archive.warnings];
  const years = new Map<YearKey, YearData>();
  const entries = new Map<YearKey, YearEntry>();
  const reportYears = new Map<YearKey, ReportYear>();

  for (const y of archive.years.values()) {
    const fy = finalizeYear(y, cfg.events);
    if (fy.count === 0 && !fy.data.note) continue;
    years.set(y.yearKey, fy.data);
    const entry: YearEntry = { yearKey: y.yearKey, count: fy.count };
    if (fy.cover.cover) entry.cover = fy.cover.cover;
    if (fy.data.note) entry.hasNote = true;
    entries.set(y.yearKey, entry);
    for (const p of fy.cover.extraCoverPaths) addWarning(warnings, 'MULTIPLE_COVERS', p);
    reportYears.set(y.yearKey, {
      yearKey: y.yearKey,
      count: fy.count,
      cover: fy.cover.mode,
      hasNote: !!fy.data.note,
      events: fy.data.events.map((e) => ({ label: e.label, category: e.category, count: e.photos.length })),
    });
  }

  const order = orderYearKeys({ keys: [...entries.keys()], thisYear });
  const indexYears: YearEntry[] = order.map((k) => entries.get(k) ?? { yearKey: k, count: 0 });
  const builtAt = now.toISOString();
  const index: Index = { v: cfg.version, builtAt, years: indexYears, eras: cfg.eras };

  warnings.push(...map.warnings);
  const excluded: Record<string, number> = { ...archive.excluded };
  for (const [k, v] of Object.entries(map.excluded)) excluded[k] = (excluded[k] ?? 0) + v;

  const report: Report = {
    v: cfg.version,
    builtAt,
    photoCount: archive.photoCount,
    years: order.filter((k) => reportYears.has(k)).map((k) => reportYears.get(k)!),
    map: map.spots.map((s) => ({ spotId: s.id, name: s.name, count: s.photos.length })),
    warnings,
    excluded,
  };

  return { index, years, spots: { spots: map.spots }, report, warnings, photoCount: archive.photoCount };
}

function addWarning(list: Warning[], code: Warning['code'], path: string): void {
  const w = list.find((x) => x.code === code && x.path === path);
  if (w) w.count++;
  else list.push({ code, path, count: 1 });
}
