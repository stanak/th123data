import type { SearchIndex } from './types';
import { createDefaultState, applyDefaultState, applyState, writeSidebarCollapsed } from './types';
import { stateFromUrl, updateHistory, type HistoryMode } from './url';
import { initLocale, setLocale, t, detectLocale, type Locale } from './i18n';
import { renderSidebar } from './views/sidebar';
import { renderCompareView } from './views/compare';
import { renderFilterView } from './views/compare';
import { renderCharacterView } from './views/character';
import { sortCharacters } from './characters';
import { buildColumnPicker, writeHiddenColumns } from './columnVisibility';

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

  const mainToolbar = document.createElement('div');
  mainToolbar.className = 'main-toolbar';
  const sidebarToggle = document.createElement('button');
  sidebarToggle.type = 'button';
  sidebarToggle.className = 'sidebar-toggle';
  mainToolbar.appendChild(sidebarToggle);

  const columnPickerWrap = document.createElement('div');
  columnPickerWrap.className = 'toolbar-column-picker';
  const columnPickerBtn = document.createElement('button');
  columnPickerBtn.type = 'button';
  columnPickerBtn.className = 'toolbar-btn';
  columnPickerBtn.textContent = t('columnVisibility');
  columnPickerWrap.appendChild(columnPickerBtn);
  const columnPickerPanel = document.createElement('div');
  columnPickerPanel.className = 'toolbar-column-panel';
  columnPickerPanel.hidden = true;
  columnPickerWrap.appendChild(columnPickerPanel);
  mainToolbar.appendChild(columnPickerWrap);

  const viewHost = document.createElement('div');
  viewHost.className = 'main-view';
  mainEl.appendChild(mainToolbar);
  mainEl.appendChild(viewHost);

  app.appendChild(sidebarEl);
  app.appendChild(mainEl);

  initLocale(detectLocale());

  const index = await loadIndex();
  const characters = sortCharacters(index.characters);
  const state = createDefaultState(characters);
  applyState(state, stateFromUrl(characters));
  setLocale(state.locale);

  function applySidebarLayout() {
    app!.classList.toggle('sidebar-collapsed', state.sidebarCollapsed);
    sidebarToggle.textContent = state.sidebarCollapsed ? '☰' : '◀';
    sidebarToggle.title = state.sidebarCollapsed ? t('sidebarShow') : t('sidebarHide');
    sidebarToggle.setAttribute('aria-label', sidebarToggle.title);
  }

  sidebarToggle.addEventListener('click', () => {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    writeSidebarCollapsed(state.sidebarCollapsed);
    applySidebarLayout();
  });

  function renderColumnPickerPanel() {
    columnPickerPanel.replaceChildren();
    columnPickerPanel.appendChild(buildColumnPicker(state.hiddenColumns, (nextHidden) => {
      state.hiddenColumns = nextHidden;
      writeHiddenColumns(nextHidden);
      renderColumnPickerPanel();
      renderMain();
    }, { compact: true }));
  }

  columnPickerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    columnPickerPanel.hidden = !columnPickerPanel.hidden;
    if (!columnPickerPanel.hidden) {
      renderColumnPickerPanel();
    }
  });

  document.addEventListener('click', (e) => {
    if (columnPickerPanel.hidden) return;
    if (!columnPickerWrap.contains(e.target as Node)) {
      columnPickerPanel.hidden = true;
    }
  });

  function onMoveClick(moveName: string) {
    state.mode = 'compare';
    state.moveName = moveName;
    state.partialMove = false;
    state.categories = new Set(['通常技', '射撃技', '必殺技', 'スペルカード']);
    render('push');
  }

  function onSort(key: string) {
    if (state.sortColumn === key) {
      if (state.sortAsc) {
        state.sortAsc = false;
      } else {
        state.sortColumn = null;
        state.sortAsc = true;
      }
    } else {
      state.sortColumn = key;
      state.sortAsc = true;
    }
    render('push');
  }

  function resetToHome() {
    const locale = state.locale;
    const hiddenColumns = state.hiddenColumns;
    const sidebarCollapsed = state.sidebarCollapsed;
    applyDefaultState(state, characters);
    state.locale = locale;
    state.hiddenColumns = hiddenColumns;
    state.sidebarCollapsed = sidebarCollapsed;
    setLocale(locale);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    render('push');
  }

  function onLocaleChange(locale: Locale) {
    state.locale = locale;
    setLocale(locale);
    render('push');
  }

  function renderMain() {
    if (state.mode === 'compare') {
      renderCompareView(viewHost, index, state, onSort, onMoveClick);
    } else if (state.mode === 'filter') {
      renderFilterView(viewHost, index, state, onSort, onMoveClick);
    } else {
      renderCharacterView(viewHost, index, state, (cat) => {
        state.characterCategory = cat;
        render('push');
      }, onSort, onMoveClick);
    }
  }

  function render(
    history: HistoryMode = 'push',
    options?: { skipSidebar?: boolean },
  ) {
    updateHistory(state, history, characters);
    applySidebarLayout();
    if (!options?.skipSidebar) {
      renderSidebar(sidebarEl, index, state, {
        onChange: (h = 'push', opts) => render(h, opts),
        onHome: resetToHome,
        onLocaleChange,
      });
    }
    renderMain();
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
