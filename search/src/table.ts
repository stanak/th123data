import type { IndexRow } from './types';
import { getStat } from './query';
import { t, displayCellValue, advantageColumnLabel, categoryLabel, getLocale } from './i18n';
import { characterLabel } from './characters';
import type { AdvantageKey } from './i18n';

export interface TableColumn {
  key: string;
  label: string;
  get: (row: IndexRow) => string;
  sortValue?: (row: IndexRow) => number | string | null;
}

export function getCompareColumns(): TableColumn[] {
  return [
    { key: 'character', label: t('colCharacter'), get: (r) => characterLabel(r.character, getLocale()), sortValue: (r) => r.character },
    {
      key: 'category',
      label: t('colCategory'),
      get: (r) => categoryLabel(r.category),
      sortValue: (r) => r.category,
    },
    { key: 'moveName', label: t('colMoveName'), get: (r) => r.moveName, sortValue: (r) => r.moveName },
    { key: 'command', label: t('colCommand'), get: (r) => r.command ?? '', sortValue: (r) => r.command ?? '' },
    { key: 'lv', label: t('colLv'), get: (r) => r.lv ?? '', sortValue: (r) => r.lv ?? '' },
    {
      key: 'startup',
      label: t('colStartup'),
      get: (r) => String(getStat(r, '動作.発生') ?? ''),
      sortValue: (r) => r.parsed.startup,
    },
    {
      key: 'total',
      label: t('colTotal'),
      get: (r) => String(getStat(r, '動作.全体') ?? ''),
      sortValue: (r) => r.parsed.total,
    },
    ...(['通常', '正G', '誤G', 'CH'] as AdvantageKey[]).map((advKey) => ({
      key: `adv${advKey}`,
      label: advantageColumnLabel(advKey),
      get: (r: IndexRow) => String(r.parsed.advantage.raws[advKey] ?? ''),
      sortValue: (r: IndexRow) => {
        const map = {
          '通常': r.parsed.advantage.tsujo,
          '正G': r.parsed.advantage.seig,
          '誤G': r.parsed.advantage.goG,
          CH: r.parsed.advantage.ch,
        };
        return map[advKey];
      },
    })),
    {
      key: 'attackLv',
      label: t('colAttackLv'),
      get: (r) => displayCellValue('攻撃Lv', String(getStat(r, '攻撃Lv') ?? '')),
      sortValue: (r) => String(getStat(r, '攻撃Lv') ?? ''),
    },
    {
      key: 'attackClass',
      label: t('colAttackClass'),
      get: (r) => displayCellValue('攻撃分類', String(getStat(r, '攻撃分類') ?? '')),
      sortValue: (r) => String(getStat(r, '攻撃分類') ?? ''),
    },
    {
      key: 'notes',
      label: t('colNotes'),
      get: (r) => String(getStat(r, '備考') ?? ''),
      sortValue: (r) => String(getStat(r, '備考') ?? ''),
    },
  ];
}

export function getFilterExtraColumn(): TableColumn {
  return {
    key: 'matchedAdv',
    label: t('colMatchedAdv'),
    get: () => '',
  };
}

export function sortRows(rows: IndexRow[], column: string | null, asc: boolean): IndexRow[] {
  if (!column) return rows;
  const col = getCompareColumns().find((c) => c.key === column);
  if (!col?.sortValue) return rows;
  const sorted = [...rows].sort((a, b) => {
    const av = col.sortValue!(a);
    const bv = col.sortValue!(b);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') return av - bv;
    return String(av).localeCompare(String(bv), 'ja');
  });
  return asc ? sorted : sorted.reverse();
}

export function renderDataTable(
  container: HTMLElement,
  rows: IndexRow[],
  columns: TableColumn[],
  options: {
    sortColumn?: string | null;
    sortAsc?: boolean;
    onSort?: (key: string) => void;
    onMoveClick?: (moveName: string) => void;
    getExtraCell?: (row: IndexRow, col: TableColumn) => string | HTMLElement | null;
    emptyMessage?: string;
  } = {},
) {
  container.replaceChildren();
  if (!rows.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-msg';
    empty.textContent = options.emptyMessage ?? t('emptyResults');
    container.appendChild(empty);
    return;
  }

  const wrap = document.createElement('div');
  wrap.className = 'table-wrap';
  const table = document.createElement('table');
  table.className = 'data-table';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const col of columns) {
    const th = document.createElement('th');
    th.textContent = col.label;
    if (options.onSort && col.sortValue) {
      th.classList.add('sortable');
      if (options.sortColumn === col.key) {
        th.classList.add(options.sortAsc ? 'sort-asc' : 'sort-desc');
      }
      th.addEventListener('click', () => options.onSort!(col.key));
    }
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const row of rows) {
    const tr = document.createElement('tr');
    tr.dataset.id = row.id;
    for (const col of columns) {
      const td = document.createElement('td');
      const extra = options.getExtraCell?.(row, col);
      if (extra instanceof HTMLElement) {
        td.appendChild(extra);
      } else if (extra != null) {
        td.textContent = extra;
      } else if (col.key === 'moveName' && options.onMoveClick && row.moveName) {
        const a = document.createElement('a');
        a.href = '#';
        a.className = 'move-link';
        a.textContent = row.moveName;
        a.addEventListener('click', (e) => {
          e.preventDefault();
          options.onMoveClick!(row.moveName);
        });
        td.appendChild(a);
      } else {
        td.textContent = col.get(row);
        if (col.key === 'notes') td.classList.add('notes-cell');
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);
  container.appendChild(wrap);
}
