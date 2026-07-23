import type { IndexRow } from './types';
import { getStat } from './query';
import { t, displayCellValue, advantageColumnLabel, categoryLabel, getLocale, ADVANTAGE_KEYS } from './i18n';
import { characterLabel, characterSortIndex } from './characters';
import { createNotesTrigger } from './notesOverlay';

export interface TableColumn {
  key: string;
  label: string;
  get: (row: IndexRow) => string;
  sortValue?: (row: IndexRow) => number | string | null;
}

export interface ColumnOptions {
  /** Single category (character view). */
  category?: string;
  /** Selected categories (compare/filter). */
  categories?: Set<string>;
}

export interface DisplayRow extends IndexRow {
  moveRowSpan: number;
  showMoveName: boolean;
  isParentSummary?: boolean;
  isVariantPlaceholder?: boolean;
  segmentCollapse?: VariantCollapseControl;
  stateCollapse?: VariantCollapseControl;
  lvCollapse?: VariantCollapseControl;
}

interface VariantCollapseControl {
  collapsed: boolean;
  summary: string;
  hiddenCount: number;
  moveKey: string;
}

type MoveCollapseState = { segment: boolean; state: boolean; lv: boolean };
type CollapseDim = 'segment' | 'state' | 'lv';

function rowHasParentSummary(row: IndexRow): row is IndexRow & {
  parentStats: Record<string, unknown>;
  parentParsed: IndexRow['parsed'];
} {
  return !!row.parentStats && !!row.parentParsed;
}

function selectedCategories(options?: ColumnOptions): string[] {
  if (options?.category) return [options.category];
  if (options?.categories?.size) return [...options.categories];
  return [];
}

function statColumn(
  key: string,
  label: string,
  path: string,
  parsedKey: keyof IndexRow['parsed'],
): TableColumn {
  return {
    key,
    label,
    get: (r) => String(getStat(r, path) ?? ''),
    sortValue: (r) => {
      const v = r.parsed[parsedKey];
      return typeof v === 'number' ? v : null;
    },
  };
}

function motionColumns(options?: ColumnOptions): TableColumn[] {
  const cats = selectedCategories(options);
  const onlySpell = cats.length === 1 && cats[0] === 'スペルカード';
  const hasCancel = cats.some((c) => c === '射撃技' || c === '必殺技');
  const hasSpell = cats.includes('スペルカード');

  if (onlySpell) {
    return [
      statColumn('total', t('colTotal'), '動作.全体', 'total'),
      statColumn('active', t('colActive'), '動作.持続', 'active'),
      statColumn('blackout', t('colBlackout'), '動作.暗転', 'blackout'),
      statColumn('startup', t('colStartup'), '動作.発生', 'startup'),
    ];
  }

  const cols: TableColumn[] = [
    statColumn('startup', t('colStartup'), '動作.発生', 'startup'),
    statColumn('active', t('colActive'), '動作.持続', 'active'),
    statColumn('total', t('colTotal'), '動作.全体', 'total'),
  ];

  if (hasCancel) {
    cols.push(
      statColumn('cancelUpper', t('colCancelUpper'), 'キャンセル.上位', 'cancelUpper'),
      statColumn('cancelMove', t('colCancelMove'), 'キャンセル.移動', 'cancelMove'),
    );
  }

  if (hasSpell) {
    cols.push(statColumn('blackout', t('colBlackout'), '動作.暗転', 'blackout'));
  }

  return cols;
}

export function rowsHaveVariants(rows: IndexRow[]): boolean {
  return rows.some((r) => r.segment || r.position || r.stateName);
}

function formatSegmentDisplay(segment: string | null): string {
  if (!segment) return '';
  return /^\d+$/.test(segment) ? `${segment}段目` : segment;
}

function rowHasVariant(row: IndexRow): boolean {
  return !!(row.segment || row.position || row.stateName);
}

function moveBlockKey(row: IndexRow): string {
  return `${row.character}\0${row.moveName}`;
}

function findScrollContainer(el: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = el.parentElement;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if (/(auto|scroll|overlay)/.test(overflowY)) return node;
    node = node.parentElement;
  }
  return null;
}

function findMoveBlockRow(container: HTMLElement, character: string, moveName: string): HTMLElement | null {
  for (const tr of container.querySelectorAll('tr')) {
    if (tr instanceof HTMLElement && tr.dataset.character === character && tr.dataset.moveName === moveName) {
      return tr;
    }
  }
  return null;
}

function restoreScrollAnchor(
  container: HTMLElement,
  anchorTop: number,
  character: string,
  moveName: string,
): void {
  const row = findMoveBlockRow(container, character, moveName);
  if (!row) return;
  const delta = row.getBoundingClientRect().top - anchorTop;
  if (Math.abs(delta) < 1) return;
  const scrollEl = findScrollContainer(container);
  if (scrollEl) {
    scrollEl.scrollTop += delta;
  } else {
    window.scrollBy(0, delta);
  }
}

function readMoveCollapseState(container: HTMLElement): Record<string, MoveCollapseState> {
  try {
    return JSON.parse(container.dataset.moveCollapse ?? '{}');
  } catch {
    return {};
  }
}

function writeMoveCollapseState(container: HTMLElement, state: Record<string, MoveCollapseState>): void {
  container.dataset.moveCollapse = JSON.stringify(state);
}

function defaultMoveCollapseState(): MoveCollapseState {
  return { segment: false, state: false, lv: false };
}

function parseLvDisplay(lv: string): number[] {
  const normalized = lv.replace(/～/g, '~');
  if (normalized.includes('~')) {
    const [start, end] = normalized.split('~').map(Number);
    if (Number.isNaN(start) || Number.isNaN(end)) return [];
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }
  const n = Number(normalized);
  return Number.isNaN(n) ? [] : [n];
}

function lvSortKey(lv: string): number {
  const nums = parseLvDisplay(lv);
  return nums.length ? nums[0] : Number.MAX_SAFE_INTEGER;
}

function formatLvSummary(lvs: string[]): string {
  const nums = [...new Set(lvs.flatMap(parseLvDisplay))].sort((a, b) => a - b);
  if (!nums.length) {
    if (!lvs.length) return '';
    if (lvs.length === 1) return lvs[0];
    if (lvs.length <= 3) return lvs.join('・');
    return `${lvs.slice(0, 2).join('・')}…`;
  }
  if (nums.length === 1) return String(nums[0]);
  let end = 0;
  while (end + 1 < nums.length && nums[end + 1] === nums[end] + 1) end++;
  if (end === nums.length - 1) return `${nums[0]}~${nums[nums.length - 1]}`;
  if (lvs.length <= 3) return lvs.join('・');
  return `${lvs.slice(0, 2).join('・')}…`;
}

function lvVariantGroupKey(row: IndexRow): string {
  return [
    row.command ?? '',
    row.segment ?? '',
    row.position ?? '',
    row.stateName ?? '',
  ].join('\0');
}

function collectLvCollapseHiddenIds(dataRows: DisplayRow[], expandedLv: boolean): Set<string> {
  if (expandedLv) return new Set();
  const hidden = new Set<string>();
  const groups = new Map<string, DisplayRow[]>();
  for (const row of dataRows) {
    if (!row.lv) continue;
    const key = lvVariantGroupKey(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }
  for (const group of groups.values()) {
    const distinct = new Set(group.map((r) => r.lv));
    if (distinct.size <= 1) continue;
    const sorted = [...group].sort((a, b) => lvSortKey(a.lv!) - lvSortKey(b.lv!));
    for (let i = 1; i < sorted.length; i++) hidden.add(sorted[i].id);
  }
  return hidden;
}

function formatSegmentSummary(segments: string[]): string {
  const nums = segments.map(Number).filter((n) => !Number.isNaN(n)).sort((a, b) => a - b);
  if (!nums.length) return '';
  if (nums.length === 1) return `${nums[0]}段目`;
  let end = 0;
  while (end + 1 < nums.length && nums[end + 1] === nums[end] + 1) end++;
  if (end === nums.length - 1) return `${nums[0]}〜${nums[nums.length - 1]}段目`;
  return nums.map((n) => `${n}段目`).join('・');
}

function formatStateSummary(states: string[]): string {
  if (!states.length) return '';
  if (states.length === 1) return states[0];
  if (states.length <= 3) return states.join('・');
  return `${states.slice(0, 2).join('・')}…`;
}

function previewCollapsedRow(
  dataRows: DisplayRow[],
  segmentRows: DisplayRow[],
  stateRows: DisplayRow[],
  hiddenIds: Set<string>,
): DisplayRow {
  const hidden = dataRows.filter((r) => hiddenIds.has(r.id));
  return hidden[0] ?? segmentRows[0] ?? stateRows[0] ?? dataRows[0];
}

function applyVariantCollapse(block: DisplayRow[], expanded: MoveCollapseState, moveKey: string): DisplayRow[] {
  const dataRows = block.filter((r) => !r.isParentSummary && !r.isVariantPlaceholder);
  const segmentRows = dataRows.filter((r) => r.segment);
  const stateRows = dataRows.filter((r) => r.stateName);
  const lvValues = [...new Set(dataRows.filter((r) => r.lv).map((r) => r.lv!))];

  const hiddenIds = new Set<string>();
  if (!expanded.segment) {
    for (const row of segmentRows) hiddenIds.add(row.id);
  }
  if (!expanded.state) {
    for (const row of stateRows) hiddenIds.add(row.id);
  }
  for (const id of collectLvCollapseHiddenIds(dataRows, expanded.lv)) hiddenIds.add(id);

  const lvHiddenCount = collectLvCollapseHiddenIds(dataRows, false).size;
  const segmentControl: VariantCollapseControl | undefined = segmentRows.length
    ? {
        collapsed: !expanded.segment,
        summary: formatSegmentSummary([...new Set(segmentRows.map((r) => r.segment!))]),
        hiddenCount: expanded.segment ? 0 : segmentRows.length,
        moveKey,
      }
    : undefined;
  const stateControl: VariantCollapseControl | undefined = stateRows.length
    ? {
        collapsed: !expanded.state,
        summary: formatStateSummary([...new Set(stateRows.map((r) => r.stateName!))]),
        hiddenCount: expanded.state ? 0 : stateRows.length,
        moveKey,
      }
    : undefined;
  const lvControl: VariantCollapseControl | undefined = lvHiddenCount
    ? {
        collapsed: !expanded.lv,
        summary: formatLvSummary(lvValues),
        hiddenCount: expanded.lv ? 0 : lvHiddenCount,
        moveKey,
      }
    : undefined;

  const collapseControls = { segmentCollapse: segmentControl, stateCollapse: stateControl, lvCollapse: lvControl };

  if (!hiddenIds.size) {
    if (!segmentControl && !stateControl && !lvControl) return block;
    return block.map((row, idx) => {
      const firstDataIdx = block.findIndex((r) => !r.isParentSummary);
      if (idx !== firstDataIdx || row.isParentSummary) return row;
      return {
        ...row,
        ...collapseControls,
      };
    });
  }

  const visible = block.filter((r) => r.isParentSummary || !hiddenIds.has(r.id));

  if (!visible.some((r) => !r.isParentSummary)) {
    const parentRow = block.find((r) => r.isParentSummary);
    if (parentRow) {
      return [{
        ...parentRow,
        ...collapseControls,
        showMoveName: true,
        moveRowSpan: 1,
      }];
    }

    const preview = previewCollapsedRow(dataRows, segmentRows, stateRows, hiddenIds);
    return [{
      ...preview,
      id: `collapse-${moveKey}`,
      isVariantPlaceholder: true,
      isParentSummary: false,
      showMoveName: true,
      moveRowSpan: 1,
      ...collapseControls,
    }];
  }

  let attached = false;
  const dataVisible = visible.filter((r) => !r.isParentSummary);
  return visible.map((row) => {
    if (row.isParentSummary) {
      if (dataVisible.length === 0) {
        return { ...row, ...collapseControls, showMoveName: true };
      }
      return { ...row, showMoveName: true };
    }
    if (attached) return { ...row, showMoveName: false };
    attached = true;
    return {
      ...row,
      ...collapseControls,
      showMoveName: dataVisible.length === visible.length,
    };
  });
}

function prepareCollapsedDisplayRows(rows: IndexRow[], container: HTMLElement): DisplayRow[] {
  const prepared = prepareDisplayRows(rows);
  const collapseState = readMoveCollapseState(container);
  const out: DisplayRow[] = [];

  let i = 0;
  while (i < prepared.length) {
    const key = moveBlockKey(prepared[i]);
    let j = i;
    while (j < prepared.length && moveBlockKey(prepared[j]) === key) j++;
    const block = prepared.slice(i, j);
    const expanded = { ...defaultMoveCollapseState(), ...collapseState[key] };
    out.push(...applyVariantCollapse(block, expanded, key));
    i = j;
  }

  let k = 0;
  while (k < out.length) {
    const key = moveBlockKey(out[k]);
    let m = k;
    while (m < out.length && moveBlockKey(out[m]) === key) m++;
    const span = m - k;
    for (let n = k; n < m; n++) {
      out[n].showMoveName = n === k;
      out[n].moveRowSpan = n === k ? span : 0;
    }
    k = m;
  }

  return out;
}

function createVariantToggle(
  control: VariantCollapseControl,
  dim: CollapseDim,
  container: HTMLElement,
  rerender: (anchorRow?: HTMLElement | null) => void,
  label?: string,
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'variant-toggle';
  const text = label || control.summary;
  btn.title = control.collapsed
    ? (label && label !== control.summary ? `${t('expandVariants')} (${control.summary})` : t('expandVariants'))
    : t('collapseVariants');
  btn.textContent = control.collapsed ? `▶ ${text}` : `▼ ${text}`;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const state = readMoveCollapseState(container);
    const current = { ...defaultMoveCollapseState(), ...state[control.moveKey] };
    state[control.moveKey] = {
      ...current,
      [dim]: !current[dim],
    };
    writeMoveCollapseState(container, state);
    rerender(btn.closest('tr'));
  });
  return btn;
}

function variantCollapseControl(row: DisplayRow, colKey: string): VariantCollapseControl | undefined {
  if (colKey === 'segment') return row.segmentCollapse;
  if (colKey === 'stateName') return row.stateCollapse;
  if (colKey === 'lv') return row.lvCollapse;
  return undefined;
}

function variantCellDisplayText(colKey: string, row: DisplayRow, col: TableColumn): string {
  const value = col.get(row);
  if (value) return value;
  const control = variantCollapseControl(row, colKey);
  if (control?.collapsed) return control.summary;
  return '';
}

function renderVariantColumnCell(
  td: HTMLTableCellElement,
  colKey: string,
  row: DisplayRow,
  col: TableColumn,
  container: HTMLElement,
  rerender: (anchorRow?: HTMLElement | null) => void,
): boolean {
  const control = variantCollapseControl(row, colKey);
  if (!control) return false;

  const displayText = variantCellDisplayText(colKey, row, col);
  const dim: CollapseDim = colKey === 'stateName' ? 'state' : colKey as CollapseDim;
  td.appendChild(createVariantToggle(control, dim, container, rerender, displayText || undefined));
  return true;
}

export function prepareDisplayRows(rows: IndexRow[]): DisplayRow[] {
  const expanded: DisplayRow[] = [];
  let i = 0;
  while (i < rows.length) {
    const row = rows[i];
    const key = `${row.character}\0${row.moveName}`;
    let j = i;
    while (j < rows.length && `${rows[j].character}\0${rows[j].moveName}` === key) j++;
    expanded.push(...expandMoveBlock(rows.slice(i, j)));
    i = j;
  }

  let k = 0;
  while (k < expanded.length) {
    const key = `${expanded[k].character}\0${expanded[k].moveName}`;
    let m = k;
    while (m < expanded.length && `${expanded[m].character}\0${expanded[m].moveName}` === key) m++;
    const span = m - k;
    for (let n = k; n < m; n++) {
      expanded[n].showMoveName = n === k;
      expanded[n].moveRowSpan = n === k ? span : 0;
    }
    k = m;
  }
  return expanded;
}

function expandMoveBlock(group: IndexRow[]): DisplayRow[] {
  const out: DisplayRow[] = [];
  let i = 0;
  while (i < group.length) {
    const row = group[i];
    if (!rowHasVariant(row)) {
      out.push({ ...row, moveRowSpan: 1, showMoveName: true });
      i++;
      continue;
    }

    let j = i;
    while (j < group.length && rowHasVariant(group[j])) j++;
    const hasParentSummary = rowHasParentSummary(row);
    if (hasParentSummary) {
      out.push({
        ...row,
        id: `parent-${row.id}`,
        isParentSummary: true,
        moveRowSpan: 1,
        showMoveName: true,
        segment: null,
        position: null,
        stateName: null,
        stats: row.parentStats,
        parsed: row.parentParsed,
      });
    }
    for (let idx = i; idx < j; idx++) {
      out.push({
        ...group[idx],
        moveRowSpan: 1,
        showMoveName: !hasParentSummary && idx === i,
      });
    }
    i = j;
  }
  return out;
}

export function columnOptionsFromCategory(category: string): ColumnOptions {
  return { category };
}

export function columnOptionsFromCategories(categories: Set<string>): ColumnOptions {
  return { categories };
}

export function getCompareColumns(options?: ColumnOptions, rows?: IndexRow[]): TableColumn[] {
  const hasVariants = rows ? rowsHaveVariants(rows) : false;
  const cols: TableColumn[] = [
    { key: 'character', label: t('colCharacter'), get: (r) => characterLabel(r.character, getLocale()), sortValue: (r) => characterSortIndex(r.character) },
    {
      key: 'category',
      label: t('colCategory'),
      get: (r) => categoryLabel(r.category),
      sortValue: (r) => r.category,
    },
  ];

  cols.push({
    key: 'moveName',
    label: t('colMoveName'),
    get: (r) => {
      const display = r as DisplayRow;
      if (display.showMoveName === false) return '';
      return r.moveName;
    },
    sortValue: (r) => r.moveName,
  });

  if (hasVariants) {
    cols.push(
      {
        key: 'segment',
        label: t('colSegment'),
        get: (r) => formatSegmentDisplay(r.segment),
        sortValue: (r) => r.segment ?? '',
      },
      {
        key: 'position',
        label: t('colPosition'),
        get: (r) => r.position ?? '',
        sortValue: (r) => r.position ?? '',
      },
      {
        key: 'stateName',
        label: t('colState'),
        get: (r) => r.stateName ?? '',
        sortValue: (r) => r.stateName ?? '',
      },
    );
  }

  cols.push(
    { key: 'command', label: t('colCommand'), get: (r) => r.command ?? '', sortValue: (r) => r.command ?? '' },
    { key: 'lv', label: t('colLv'), get: (r) => r.lv ?? '', sortValue: (r) => r.lv ?? '' },
    ...motionColumns(options),
    ...ADVANTAGE_KEYS.map((advKey) => ({
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
  );

  return cols;
}

export function sortRows(
  rows: IndexRow[],
  column: string | null,
  asc: boolean,
  options?: ColumnOptions,
): IndexRow[] {
  if (!column) return rows;
  const col = getCompareColumns(options, rows).find((c) => c.key === column);
  if (!col?.sortValue) return rows;
  const sorted = [...rows].sort((a, b) => {
    if (column === 'stateName' || column === 'segment' || column === 'position' || column === 'moveName') {
      const moveCmp = a.moveName.localeCompare(b.moveName, 'ja');
      if (moveCmp !== 0) return moveCmp;
      const segCmp = String(a.segment ?? '').localeCompare(String(b.segment ?? ''), 'ja', { numeric: true });
      if (segCmp !== 0) return segCmp;
      const posCmp = String(a.position ?? '').localeCompare(String(b.position ?? ''), 'ja');
      if (posCmp !== 0) return posCmp;
      return String(a.stateName ?? '').localeCompare(String(b.stateName ?? ''), 'ja', { numeric: true });
    }
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
  scrollAnchorRow?: HTMLElement | null,
) {
  let scrollAnchor: { top: number; character: string; moveName: string } | null = null;
  if (scrollAnchorRow?.dataset.character && scrollAnchorRow.dataset.moveName) {
    scrollAnchor = {
      top: scrollAnchorRow.getBoundingClientRect().top,
      character: scrollAnchorRow.dataset.character,
      moveName: scrollAnchorRow.dataset.moveName,
    };
  }

  container.replaceChildren();
  if (!rows.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-msg';
    empty.textContent = options.emptyMessage ?? t('emptyResults');
    container.appendChild(empty);
    return;
  }

  const displayRows: DisplayRow[] = prepareCollapsedDisplayRows(rows, container);

  const rerender = (anchorRow?: HTMLElement | null) => {
    renderDataTable(container, rows, columns, options, anchorRow);
  };

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
  for (const row of displayRows) {
    const tr = document.createElement('tr');
    tr.dataset.id = row.id;
    tr.dataset.character = row.character;
    tr.dataset.moveName = row.moveName;
    if (row.isParentSummary) tr.classList.add('move-parent-row');
    if (row.isVariantPlaceholder) tr.classList.add('variant-collapsed-row');
    for (const col of columns) {
      if (col.key === 'moveName' && !row.showMoveName) {
        continue;
      }
      if ((col.key === 'stateName' || col.key === 'segment' || col.key === 'position' || col.key === 'lv') && row.isParentSummary) {
        const td = document.createElement('td');
        if (!renderVariantColumnCell(td, col.key, row, col, container, rerender)) {
          td.textContent = col.get(row);
        }
        tr.appendChild(td);
        continue;
      }

      const td = document.createElement('td');
      if (col.key === 'moveName' && row.moveRowSpan > 1 && row.showMoveName) {
        td.rowSpan = row.moveRowSpan;
      }

      const extra = options.getExtraCell?.(row, col);
      if (renderVariantColumnCell(td, col.key, row, col, container, rerender)) {
        // value + toggle
      } else if (extra instanceof HTMLElement) {
        td.appendChild(extra);
      } else if (extra != null) {
        td.textContent = extra;
      } else if (
        col.key === 'moveName' &&
        options.onMoveClick &&
        row.moveName &&
        row.showMoveName
      ) {
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
        if (col.key === 'notes') {
          td.classList.add('notes-cell');
          const notesText = col.get(row);
          const notesTitle = [
            characterLabel(row.character, getLocale()),
            row.moveName,
            row.stateName,
          ].filter(Boolean).join(' — ');
          const trigger = createNotesTrigger(notesText, notesTitle);
          if (trigger) td.appendChild(trigger);
        } else {
          td.textContent = col.get(row);
        }
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);
  container.appendChild(wrap);

  if (scrollAnchor) {
    requestAnimationFrame(() => {
      restoreScrollAnchor(container, scrollAnchor.top, scrollAnchor.character, scrollAnchor.moveName);
    });
  }
}
