import type { AppState, IndexRow, SearchIndex } from '../types';
import {
  applyConditions,
  filterByMoveName,
  advantagePresetCondition,
  matchedAdvantageLabel,
} from '../query';
import { t } from '../i18n';
import { getCompareColumns, getFilterExtraColumn, sortRows, renderDataTable } from '../table';

export function getCompareRows(index: SearchIndex, state: AppState): IndexRow[] {
  let rows = index.rows.filter(
    (r) => state.categories.has(r.category) && state.characters.has(r.character),
  );
  rows = filterByMoveName(rows, state.moveName, state.partialMove);
  rows = sortRows(rows, state.sortColumn, state.sortAsc);

  if (!state.showMissingCompare && state.moveName.trim()) {
    return rows;
  }

  if (!state.showMissingCompare || !state.moveName.trim()) {
    return rows;
  }

  const found = new Set(rows.map((r) => r.character));
  const placeholders: IndexRow[] = [];
  for (const character of index.characters) {
    if (!state.characters.has(character)) continue;
    if (found.has(character)) continue;
    placeholders.push({
      id: `missing-${character}`,
      character,
      category: [...state.categories][0] ?? '',
      moveName: state.moveName,
      command: null,
      lv: null,
      stats: {},
      parsed: {
        startup: null,
        total: null,
        active: null,
        advantage: { seig: null, goG: null, tsujo: null, ch: null, min: null, max: null, raws: {} },
      },
    });
  }
  return sortRows([...rows, ...placeholders], state.sortColumn, state.sortAsc);
}

export function renderCompareView(
  container: HTMLElement,
  index: SearchIndex,
  state: AppState,
  onSort: (key: string) => void,
  onMoveClick: (moveName: string) => void,
) {
  const rows = getCompareRows(index, state);
  container.replaceChildren();

  const header = document.createElement('div');
  header.className = 'view-header';
  const title = document.createElement('h2');
  title.textContent = state.moveName.trim()
    ? t('compareTitleNamed', { move: state.moveName }) + (state.partialMove ? t('partialSuffix') : '')
    : t('compareTitle');
  header.appendChild(title);
  const count = document.createElement('span');
  count.className = 'result-count';
  count.textContent = t('resultCount', { count: rows.length });
  header.appendChild(count);
  container.appendChild(header);

  if (!state.moveName.trim()) {
    const hint = document.createElement('p');
    hint.className = 'hint-msg';
    hint.textContent = t('compareHint');
    container.appendChild(hint);
    return;
  }

  const tableHost = document.createElement('div');
  container.appendChild(tableHost);
  renderDataTable(tableHost, rows, getCompareColumns(), {
    sortColumn: state.sortColumn,
    sortAsc: state.sortAsc,
    onSort,
    onMoveClick,
    emptyMessage: t('emptyResults'),
    getExtraCell: (row, col) => {
      if (row.id.startsWith('missing-') && col.key !== 'character' && col.key !== 'moveName') {
        return '—';
      }
      return null;
    },
  });
}

export function getFilterRows(index: SearchIndex, state: AppState): IndexRow[] {
  let rows = index.rows.filter(
    (r) => state.categories.has(r.category) && state.characters.has(r.character),
  );
  rows = filterByMoveName(rows, state.moveName, state.partialMove);
  const conditions = [...state.conditions];
  if (state.advantagePreset != null) {
    conditions.push(advantagePresetCondition(state.advantagePreset));
  }
  rows = applyConditions(rows, conditions);
  return sortRows(rows, state.sortColumn, state.sortAsc);
}

export function renderFilterView(
  container: HTMLElement,
  index: SearchIndex,
  state: AppState,
  onSort: (key: string) => void,
  onMoveClick: (moveName: string) => void,
) {
  const rows = getFilterRows(index, state);
  container.replaceChildren();

  const header = document.createElement('div');
  header.className = 'view-header';
  const title = document.createElement('h2');
  title.textContent = t('filterTitle');
  header.appendChild(title);
  const count = document.createElement('span');
  count.className = 'result-count';
  count.textContent = t('resultCountTotal', { count: rows.length, total: index.rowCount });
  header.appendChild(count);
  container.appendChild(header);

  const filterCols = [
    ...getCompareColumns().filter((c) => !['adv通常', 'adv正G'].includes(c.key)),
    {
      ...getFilterExtraColumn(),
      get: (row: IndexRow) =>
        state.advantagePreset != null
          ? matchedAdvantageLabel(row, state.advantagePreset)
          : matchedAdvantageLabel(row),
    },
  ];
  const tableHost = document.createElement('div');
  container.appendChild(tableHost);

  renderDataTable(tableHost, rows, filterCols, {
    sortColumn: state.sortColumn,
    sortAsc: state.sortAsc,
    onSort,
    onMoveClick,
  });
}
