import type { AppState } from './types';

export function stateToUrl(state: AppState): string {
  const p = new URLSearchParams();
  p.set('mode', state.mode);
  if (state.moveName) p.set('move', state.moveName);
  if (state.partialMove) p.set('partial', '1');
  if (state.categories.size) p.set('cat', [...state.categories].join(','));
  if (state.mode !== 'character' && state.characters.size) {
    p.set('chars', [...state.characters].join(','));
  }
  if (state.selectedCharacter) p.set('char', state.selectedCharacter);
  if (state.characterCategory) p.set('charCat', state.characterCategory);
  if (state.advantagePreset != null) p.set('adv', String(state.advantagePreset));
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
  return `${location.pathname}?${p}`;
}

export function urlToState(characters: string[]): Partial<AppState> {
  const p = new URLSearchParams(location.search);
  const mode = p.get('mode');
  const validMode = mode === 'compare' || mode === 'filter' || mode === 'character' ? mode : undefined;
  const catStr = p.get('cat');
  const charsStr = p.get('chars');
  const conditions = [];
  for (let i = 0; ; i++) {
    const field = p.get(`c${i}f`);
    const op = p.get(`c${i}o`);
    const value = p.get(`c${i}v`);
    if (!field || !op || value == null) break;
    if (['<=', '>=', '=', '!=', 'contains', 'matches'].includes(op)) {
      conditions.push({ field, op: op as AppState['conditions'][0]['op'], value });
    }
  }
  const adv = p.get('adv');
  return {
    mode: validMode,
    moveName: p.get('move') ?? undefined,
    partialMove: p.get('partial') === '1',
    categories: catStr ? new Set(catStr.split(',').filter(Boolean)) : undefined,
    characters: charsStr ? new Set(charsStr.split(',').filter(Boolean)) : undefined,
    selectedCharacter: p.get('char') ?? characters[0],
    characterCategory: p.get('charCat') ?? '通常技',
    advantagePreset: adv != null && adv !== '' ? Number(adv) : null,
    showMissingCompare: p.get('missing') === '1',
    sortColumn: p.get('sort'),
    sortAsc: p.get('asc') !== '0',
    conditions: conditions.length ? conditions : undefined,
  };
}

export function syncUrl(state: AppState) {
  const url = stateToUrl(state);
  history.replaceState(null, '', url);
}
