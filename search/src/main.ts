import type { AppState, SearchIndex } from './types';
import { createDefaultState } from './types';
import { urlToState, syncUrl } from './url';
import { renderSidebar } from './views/sidebar';
import { renderCompareView, getCompareRows, getFilterRows } from './views/compare';
import { renderFilterView } from './views/compare';
import { renderCharacterView, getCharacterRows } from './views/character';
import { COMPARE_COLUMNS, rowsToCsv, downloadCsv } from './table';

async function loadIndex(): Promise<SearchIndex> {
  const res = await fetch(`${import.meta.env.BASE_URL}search_index.json`);
  if (!res.ok) throw new Error('search_index.json の読み込みに失敗しました');
  return res.json();
}

function mergeUrlState(state: AppState, partial: Partial<AppState>) {
  if (partial.mode) state.mode = partial.mode;
  if (partial.moveName != null) state.moveName = partial.moveName;
  if (partial.partialMove != null) state.partialMove = partial.partialMove;
  if (partial.categories) state.categories = partial.categories;
  if (partial.characters) state.characters = partial.characters;
  if (partial.selectedCharacter) state.selectedCharacter = partial.selectedCharacter;
  if (partial.characterCategory) state.characterCategory = partial.characterCategory;
  if (partial.advantagePreset !== undefined) state.advantagePreset = partial.advantagePreset;
  if (partial.showMissingCompare != null) state.showMissingCompare = partial.showMissingCompare;
  if (partial.sortColumn !== undefined) state.sortColumn = partial.sortColumn;
  if (partial.sortAsc != null) state.sortAsc = partial.sortAsc;
  if (partial.conditions) state.conditions = partial.conditions;
}

function getCurrentRows(index: SearchIndex, state: AppState) {
  if (state.mode === 'compare') return getCompareRows(index, state);
  if (state.mode === 'filter') return getFilterRows(index, state);
  return getCharacterRows(index, state);
}

async function main() {
  const app = document.getElementById('app');
  if (!app) return;

  const sidebarEl = document.createElement('aside');
  sidebarEl.className = 'sidebar';
  const mainEl = document.createElement('main');
  mainEl.className = 'main';
  app.appendChild(sidebarEl);
  app.appendChild(mainEl);

  const index = await loadIndex();
  const state = createDefaultState(index.characters);
  mergeUrlState(state, urlToState(index.characters));

  function onMoveClick(moveName: string) {
    state.mode = 'compare';
    state.moveName = moveName;
    state.partialMove = false;
    state.categories = new Set(['通常技', '射撃技', '必殺技', 'スペルカード', '基本動作']);
    render();
  }

  function onSort(key: string) {
    if (state.sortColumn === key) {
      state.sortAsc = !state.sortAsc;
    } else {
      state.sortColumn = key;
      state.sortAsc = true;
    }
    render();
  }

  function onExport() {
    const rows = getCurrentRows(index, state);
    let columns = COMPARE_COLUMNS;
    if (state.mode === 'character') {
      columns = COMPARE_COLUMNS.filter((c) => c.key !== 'character' && c.key !== 'category');
    }
    const csv = rowsToCsv(rows, columns);
    downloadCsv(`th123_${state.mode}.csv`, csv);
  }

  function render() {
    syncUrl(state);
    renderSidebar(sidebarEl, index, state, { onChange: render, onExport });

    if (state.mode === 'compare') {
      renderCompareView(mainEl, index, state, onSort, onMoveClick);
    } else if (state.mode === 'filter') {
      renderFilterView(mainEl, index, state, onSort, onMoveClick);
    } else {
      renderCharacterView(mainEl, index, state, (cat) => {
        state.characterCategory = cat;
        render();
      }, onSort, onMoveClick);
    }
  }

  window.addEventListener('popstate', () => {
    mergeUrlState(state, urlToState(index.characters));
    render();
  });

  render();
}

main().catch((err) => {
  const app = document.getElementById('app');
  if (app) {
    app.textContent = `エラー: ${err.message}`;
  }
});
