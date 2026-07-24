import type { AppState } from './types';
import { createDefaultState, readSidebarCollapsed } from './types';
import { ALL_COLUMN_DEFS, readHiddenColumns } from './columnVisibility';
import type { Locale } from './i18n';
import { detectLocale } from './i18n';
import { sortCharacters } from './characters';

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

function parseConditions(p: URLSearchParams): AppState['conditions'] {
  const conditions: AppState['conditions'] = [];
  for (let i = 0; ; i++) {
    const field = p.get(`c${i}f`);
    const op = p.get(`c${i}o`);
    const value = p.get(`c${i}v`);
    if (!field || !op || value == null) break;
    if (['<=', '>=', '=', '!=', 'contains', 'matches'].includes(op)) {
      conditions.push({ field, op: op as AppState['conditions'][0]['op'], value });
    }
  }
  return conditions;
}

function parseHiddenColumns(p: URLSearchParams): Set<string> | null {
  if (!p.has('hide')) return null;
  const hide = p.get('hide') ?? '';
  if (!hide) return new Set();
  const valid = new Set(ALL_COLUMN_DEFS.map((d) => d.key));
  return new Set(hide.split(',').filter((k) => valid.has(k)));
}

function parseSearchFields(
  p: URLSearchParams,
  mode: AppState['mode'],
): Pick<AppState, 'freeQuery' | 'moveName'> {
  const moveParam = p.get('move') ?? '';
  const qParam = p.get('q') ?? '';

  if (mode === 'compare') {
    return { moveName: moveParam, freeQuery: qParam };
  }

  // Legacy URLs used move= for sidebar search in filter/character modes.
  return { moveName: '', freeQuery: qParam || moveParam };
}

export function stateFromUrl(characters: string[]): AppState {
  const orderedCharacters = sortCharacters(characters);
  const defaults = createDefaultState(orderedCharacters);
  const p = new URLSearchParams(location.search);
  if (!p.toString()) {
    return { ...defaults, locale: detectLocale() };
  }

  const modeRaw = p.get('mode');
  const moveParam = p.get('move') ?? '';
  let mode =
    modeRaw === 'compare' || modeRaw === 'filter' || modeRaw === 'character'
      ? modeRaw
      : defaults.mode;
  if (mode === 'compare' && !moveParam) {
    mode = defaults.mode;
  }
  const charsStr = p.get('chars');
  const catStr = p.get('cat');
  const search = parseSearchFields(p, mode);

  return {
    mode,
    locale: (p.get('lang') === 'en' ? 'en' : 'ja') as Locale,
    freeQuery: search.freeQuery,
    moveName: search.moveName,
    partialMove: false,
    categories: catStr ? new Set(catStr.split(',').filter(Boolean)) : new Set(defaults.categories),
    characters: charsStr
      ? new Set(sortCharacters(charsStr.split(',').filter(Boolean)))
      : new Set(orderedCharacters),
    selectedCharacter: p.get('char') ?? defaults.selectedCharacter,
    characterCategory: p.get('charCat') ?? defaults.characterCategory,
    conditions: parseConditions(p),
    showMissingCompare: p.get('missing') === '1',
    sortColumn: p.get('sort'),
    sortAsc: p.get('asc') !== '0',
    sidebarCollapsed: readSidebarCollapsed(),
    hiddenColumns: parseHiddenColumns(p) ?? readHiddenColumns(),
  };
}

export function stateToUrl(state: AppState, characters: string[]): string {
  const orderedCharacters = sortCharacters(characters);
  const defaults = createDefaultState(orderedCharacters);
  const isHome =
    state.mode === defaults.mode &&
    state.freeQuery === '' &&
    state.moveName === '' &&
    setsEqual(state.categories, defaults.categories) &&
    setsEqual(state.characters, defaults.characters) &&
    state.selectedCharacter === defaults.selectedCharacter &&
    state.characterCategory === defaults.characterCategory &&
    state.conditions.length === 0 &&
    !state.showMissingCompare &&
    state.sortColumn === null &&
    state.hiddenColumns.size === 0 &&
    state.locale === defaults.locale;

  const p = new URLSearchParams();
  if (state.locale !== 'ja') p.set('lang', state.locale);
  if (isHome) {
    const qs = p.toString();
    return qs ? `${location.pathname}?${qs}` : location.pathname;
  }

  p.set('mode', state.mode);
  if (state.mode === 'compare') {
    if (state.moveName) p.set('move', state.moveName);
    if (state.freeQuery) p.set('q', state.freeQuery);
  } else if (state.freeQuery) {
    p.set('q', state.freeQuery);
  }
  if (state.categories.size) p.set('cat', [...state.categories].join(','));
  if (state.mode !== 'character' && state.characters.size) {
    p.set('chars', sortCharacters(state.characters).join(','));
  }
  if (state.selectedCharacter) p.set('char', state.selectedCharacter);
  if (state.characterCategory) p.set('charCat', state.characterCategory);
  if (state.showMissingCompare) p.set('missing', '1');
  if (state.sortColumn) {
    p.set('sort', state.sortColumn);
    p.set('asc', state.sortAsc ? '1' : '0');
  }
  if (state.hiddenColumns.size) {
    p.set('hide', [...state.hiddenColumns].sort().join(','));
  }
  for (const [i, c] of state.conditions.entries()) {
    p.set(`c${i}f`, c.field);
    p.set(`c${i}o`, c.op);
    p.set(`c${i}v`, c.value);
  }
  return `${location.pathname}?${p.toString()}`;
}

export function currentUrl(): string {
  return location.pathname + location.search;
}

export type HistoryMode = 'push' | 'replace' | 'none';

export function updateHistory(state: AppState, mode: HistoryMode, characters: string[]): void {
  if (mode === 'none') return;
  const url = stateToUrl(state, characters);
  if (url === currentUrl()) return;
  if (mode === 'push') history.pushState(null, '', url);
  else history.replaceState(null, '', url);
}
