import charactersData from '../../characters.json';

export const CHARACTER_ORDER = charactersData.order;
export const CHARACTER_EN: Record<string, string> = charactersData.en;

export function characterLabel(name: string, locale: 'ja' | 'en'): string {
  if (locale === 'ja') return name;
  return CHARACTER_EN[name] ?? name;
}

/** Keep canonical roster order from characters.json / frame_data.json. */
export function sortCharacters(names: Iterable<string>): string[] {
  const set = new Set(names);
  const ordered = CHARACTER_ORDER.filter((n) => set.has(n));
  for (const n of set) {
    if (!CHARACTER_ORDER.includes(n)) ordered.push(n);
  }
  return ordered;
}

export function characterSortIndex(name: string): number {
  const i = CHARACTER_ORDER.indexOf(name);
  return i >= 0 ? i : CHARACTER_ORDER.length;
}
