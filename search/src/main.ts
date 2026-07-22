import type { SearchIndex } from './types';
import { createDefaultState, applyDefaultState, applyState } from './types';
import { stateFromUrl, updateHistory, type HistoryMode } from './url';
import { renderSidebar } from './views/sidebar';
import { renderCompareView } from './views/compare';
import { renderFilterView } from './views/compare';
import { renderCharacterView } from './views/character';

async function loadIndex(): Promise<SearchIndex> {
  const res = await fetch(`${import.meta.env.BASE_URL}search_index.json`);
  if (!res.ok) throw new Error('search_index.json の読み込みに失敗しました');
  return res.json();
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
  applyState(state, stateFromUrl(index.characters));

  function onMoveClick(moveName: string) {
    state.mode = 'compare';
    state.moveName = moveName;
    state.partialMove = false;
    state.categories = new Set(['通常技', '射撃技', '必殺技', 'スペルカード']);
    render('push');
  }

  function onSort(key: string) {
    if (state.sortColumn === key) {
      state.sortAsc = !state.sortAsc;
    } else {
      state.sortColumn = key;
      state.sortAsc = true;
    }
    render('push');
  }

  function resetToHome() {
    applyDefaultState(state, index.characters);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    render('push');
  }

  function render(history: HistoryMode = 'push') {
    updateHistory(state, history, index.characters);
    renderSidebar(sidebarEl, index, state, {
      onChange: (h = 'push') => render(h),
      onHome: resetToHome,
    });

    if (state.mode === 'compare') {
      renderCompareView(mainEl, index, state, onSort, onMoveClick);
    } else if (state.mode === 'filter') {
      renderFilterView(mainEl, index, state, onSort, onMoveClick);
    } else {
      renderCharacterView(mainEl, index, state, (cat) => {
        state.characterCategory = cat;
        render('push');
      }, onSort, onMoveClick);
    }
  }

  window.addEventListener('popstate', () => {
    applyState(state, stateFromUrl(index.characters));
    render('none');
  });

  render('replace');
}

main().catch((err) => {
  const app = document.getElementById('app');
  if (app) {
    app.textContent = `エラー: ${err.message}`;
  }
});
