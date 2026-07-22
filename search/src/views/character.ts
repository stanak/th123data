import type { AppState, IndexRow, SearchIndex } from '../types';
import {
  applyConditions,
  filterByMoveName,
  advantagePresetCondition,
} from '../query';
import { COMPARE_COLUMNS, sortRows, renderDataTable } from '../table';

export function getCharacterRows(index: SearchIndex, state: AppState): IndexRow[] {
  let rows = index.rows.filter(
    (r) =>
      r.character === state.selectedCharacter &&
      r.category === state.characterCategory,
  );
  rows = filterByMoveName(rows, state.moveName, state.partialMove);
  const conditions = [...state.conditions];
  if (state.advantagePreset != null) {
    conditions.push(advantagePresetCondition(state.advantagePreset));
  }
  rows = applyConditions(rows, conditions);
  return sortRows(rows, state.sortColumn, state.sortAsc);
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
  title.textContent = `${state.selectedCharacter} — フレームデータ`;
  header.appendChild(title);
  const count = document.createElement('span');
  count.className = 'result-count';
  count.textContent = `${rows.length}件`;
  header.appendChild(count);
  container.appendChild(header);

  const tabs = document.createElement('div');
  tabs.className = 'category-tabs';
  for (const cat of index.categories) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tab-btn' + (cat === state.characterCategory ? ' active' : '');
    btn.textContent = `${cat} (${counts[cat] ?? 0})`;
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
    summary.textContent = '脚注';
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

  const charCols = COMPARE_COLUMNS.filter((c) => c.key !== 'character' && c.key !== 'category');
  const tableHost = document.createElement('div');
  container.appendChild(tableHost);

  renderDataTable(tableHost, rows, charCols, {
    sortColumn: state.sortColumn,
    sortAsc: state.sortAsc,
    onSort,
    onMoveClick,
    emptyMessage: 'このカテゴリに該当する技がありません',
  });
}
