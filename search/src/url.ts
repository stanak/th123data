import type { AppState } from './types';
import { createDefaultState, readSidebarCollapsed } from './types';
import { readHiddenColumns } from './columnVisibility';
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

export function stateFromUrl(characters: string[]): AppState {
  const orderedCharacters = sortCharacters(characters);
  const defaults = createDefaultState(orderedCharacters);
  const p = new URLSearchParams(location.search);
  if (!p.toString()) {
    return { ...defaults, locale: detectLocale() };
  }

  const mode = p.get('mode');
  const charsStr = p.get('chars');
  const catStr = p.get('cat');

  return {
    mode:
      mode === 'compare' || mode === 'filter' || mode === 'character' ? mode : defaults.mode,
    locale: (p.get('lang') === 'en' ? 'en' : 'ja') as Locale,
    moveName: p.get('move') ?? '',
    partialMove: p.get('partial') === '1',
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
    hiddenColumns: readHiddenColumns(),
  };
}

export function stateToUrl(state: AppState, characters: string[]): string {
  const orderedCharacters = sortCharacters(characters);
  const defaults = createDefaultState(orderedCharacters);
  const isHome =
    state.mode === defaults.mode &&
    state.moveName === '' &&
    !state.partialMove &&
    setsEqual(state.categories, defaults.categories) &&
    setsEqual(state.characters, defaults.characters) &&
    state.selectedCharacter === defaults.selectedCharacter &&
    state.characterCategory === defaults.characterCategory &&
    state.conditions.length === 0 &&
    !state.showMissingCompare &&
    state.sortColumn === null &&
    state.locale === defaults.locale;

  const p = new URLSearchParams();
  if (state.locale !== 'ja') p.set('lang', state.locale);
  if (isHome) {
    const qs = p.toString();
    return qs ? `${location.pathname}?${qs}` : location.pathname;
  }

  p.set('mode', state.mode);
  if (state.moveName) p.set('move', state.moveName);
  if (state.partialMove) p.set('partial', '1');
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
