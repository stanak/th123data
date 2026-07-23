import type { AppState, IndexRow, SearchIndex } from '../types';
import {
  applyConditions,
  filterByFreeText,
} from '../query';
import { t, categoryLabel, getLocale } from '../i18n';
import { characterLabel } from '../characters';
import { getCompareColumns, sortRows, renderDataTable, columnOptionsFromCategory } from '../table';
import { applyColumnVisibility } from '../columnVisibility';

export function getCharacterRows(index: SearchIndex, state: AppState): IndexRow[] {
  let rows = index.rows.filter(
    (r) =>
      r.character === state.selectedCharacter &&
      r.category === state.characterCategory,
  );
  rows = filterByFreeText(rows, state.freeQuery);
  rows = applyConditions(rows, state.conditions);
  return sortRows(rows, state.sortColumn, state.sortAsc, columnOptionsFromCategory(state.characterCategory));
}

export function countByCategory(index: SearchIndex, character: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of index.rows) {
    if (row.character !== character) continue;
    counts[row.category] = (counts[row.category] ?? 0) + 1;
  }
  return counts;
}

export function renderCharacterView(
  container: HTMLElement,
  index: SearchIndex,
  state: AppState,
  onCategoryChange: (cat: string) => void,
  onSort: (key: string) => void,
  onMoveClick: (moveName: string) => void,
) {
  const rows = getCharacterRows(index, state);
  const counts = countByCategory(index, state.selectedCharacter);
  container.replaceChildren();

  const header = document.createElement('div');
  header.className = 'view-header';
  const title = document.createElement('h2');
  title.textContent = t('characterFrameData', { name: characterLabel(state.selectedCharacter, getLocale()) });
  header.appendChild(title);
  const count = document.createElement('span');
  count.className = 'result-count';
  count.textContent = t('resultCount', { count: rows.length });
  header.appendChild(count);
  container.appendChild(header);

  const tabs = document.createElement('div');
  tabs.className = 'category-tabs';
  for (const cat of index.categories) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tab-btn' + (cat === state.characterCategory ? ' active' : '');
    btn.textContent = `${categoryLabel(cat)} (${counts[cat] ?? 0})`;
    btn.addEventListener('click', () => onCategoryChange(cat));
    tabs.appendChild(btn);
  }
  container.appendChild(tabs);

  const footnotes = index.footnotes[state.selectedCharacter];
  if (footnotes && Object.keys(footnotes).length) {
    const fnBox = document.createElement('details');
    fnBox.className = 'footnotes-box';
    fnBox.open = false;
    const summary = document.createElement('summary');
    summary.textContent = t('footnotes');
    fnBox.appendChild(summary);
    const list = document.createElement('div');
    list.className = 'footnotes-list';
    for (const [key, text] of Object.entries(footnotes)) {
      const p = document.createElement('p');
      p.innerHTML = `<strong>${key}</strong> ${text}`;
      list.appendChild(p);
    }
    fnBox.appendChild(list);
    container.appendChild(fnBox);
  }

  const columnOptions = columnOptionsFromCategory(state.characterCategory);
  const charCols = applyColumnVisibility(
    getCompareColumns(columnOptions, rows).filter((c) => c.key !== 'character' && c.key !== 'category'),
    state.hiddenColumns,
  );
  const tableHost = document.createElement('div');
  container.appendChild(tableHost);

  renderDataTable(tableHost, rows, charCols, {
    sortColumn: state.sortColumn,
    sortAsc: state.sortAsc,
    onSort,
    onMoveClick,
    emptyMessage: t('emptyCategory'),
  });
}
