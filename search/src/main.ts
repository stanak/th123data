import type { SearchIndex } from './types';
import { createDefaultState, applyDefaultState, applyState } from './types';
import { stateFromUrl, updateHistory, type HistoryMode } from './url';
import { initLocale, setLocale, t, detectLocale, type Locale } from './i18n';
import { renderSidebar } from './views/sidebar';
import { renderCompareView } from './views/compare';
import { renderFilterView } from './views/compare';
import { renderCharacterView } from './views/character';
import { sortCharacters } from './characters';

async function loadIndex(): Promise<SearchIndex> {
  const res = await fetch(`${import.meta.env.BASE_URL}search_index.json`);
  if (!res.ok) throw new Error(t('loadError'));
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

  initLocale(detectLocale());

  const index = await loadIndex();
  const characters = sortCharacters(index.characters);
  const state = createDefaultState(characters);
  applyState(state, stateFromUrl(characters));
  setLocale(state.locale);

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
    const locale = state.locale;
    applyDefaultState(state, characters);
    state.locale = locale;
    setLocale(locale);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    render('push');
  }

  function onLocaleChange(locale: Locale) {
    state.locale = locale;
    setLocale(locale);
    render('push');
  }

  function render(history: HistoryMode = 'push') {
    updateHistory(state, history, characters);
    renderSidebar(sidebarEl, index, state, {
      onChange: (h = 'push') => render(h),
      onHome: resetToHome,
      onLocaleChange,
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
    applyState(state, stateFromUrl(characters));
    setLocale(state.locale);
    render('none');
  });

  render('replace');
}

main().catch((err) => {
  const app = document.getElementById('app');
  if (app) {
    app.textContent = String(err.message);
  }
});
