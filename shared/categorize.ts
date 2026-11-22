// docs/SPEC.md §4.2 の 9：イベント名からカテゴリを決める
import type { EventsConfig } from './types.ts';

export function categorize(eventName: string, config: EventsConfig): string {
  for (const rule of config.rules) {
    if (rule.includes.some((s) => eventName.includes(s))) return rule.category;
  }
  return config.fallback;
}

/** カテゴリの並び順（categories にないものは最後） */
export function categoryOrder(category: string, config: EventsConfig): number {
  const i = config.categories.indexOf(category);
  return i === -1 ? config.categories.length : i;
}
