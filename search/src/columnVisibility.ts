import type { TableColumn } from './table';
import { t, type MessageKey } from './i18n';

const STORAGE_KEY = 'th123data-hidden-columns';

export type ColumnGroupId = 'identity' | 'variant' | 'motion' | 'advantage' | 'attack' | 'bullet' | 'other';

export interface ColumnDef {
  key: string;
  labelKey: MessageKey;
  group: ColumnGroupId;
}

/** All toggleable columns (picker list). */
export const ALL_COLUMN_DEFS: ColumnDef[] = [
  { key: 'character', labelKey: 'colCharacter', group: 'identity' },
  { key: 'category', labelKey: 'colCategory', group: 'identity' },
  { key: 'moveName', labelKey: 'colMoveName', group: 'identity' },
  { key: 'segment', labelKey: 'colSegment', group: 'variant' },
  { key: 'position', labelKey: 'colPosition', group: 'variant' },
  { key: 'stateName', labelKey: 'colState', group: 'variant' },
  { key: 'command', labelKey: 'colCommand', group: 'identity' },
  { key: 'lv', labelKey: 'colLv', group: 'identity' },
  { key: 'startup', labelKey: 'colStartup', group: 'motion' },
  { key: 'active', labelKey: 'colActive', group: 'motion' },
  { key: 'total', labelKey: 'colTotal', group: 'motion' },
  { key: 'blackout', labelKey: 'colBlackout', group: 'motion' },
  { key: 'cancelUpper', labelKey: 'colCancelUpper', group: 'motion' },
  { key: 'cancelMove', labelKey: 'colCancelMove', group: 'motion' },
  { key: 'adv正G', labelKey: 'colAdvSeig', group: 'advantage' },
  { key: 'adv誤G', labelKey: 'colAdvGoG', group: 'advantage' },
  { key: 'adv通常', labelKey: 'colAdvTsujo', group: 'advantage' },
  { key: 'advCH', labelKey: 'colAdvCh', group: 'advantage' },
  { key: 'attackLv', labelKey: 'colAttackLv', group: 'attack' },
  { key: 'attackClass', labelKey: 'colAttackClass', group: 'attack' },
  { key: 'hitCount', labelKey: 'colHitCount', group: 'bullet' },
  { key: 'sousaiStrength', labelKey: 'colSousaiStrength', group: 'bullet' },
  { key: 'sousaiCount', labelKey: 'colSousaiCount', group: 'bullet' },
  { key: 'grazeDurability', labelKey: 'colGrazeDurability', group: 'bullet' },
  { key: 'bulletNotes', labelKey: 'colBulletNotes', group: 'bullet' },
  { key: 'notes', labelKey: 'colNotes', group: 'other' },
  { key: 'specialNotes', labelKey: 'colSpecialNotes', group: 'other' },
  { key: 'lvUpEffect', labelKey: 'colLvUpEffect', group: 'other' },
];

const GROUP_LABEL_KEYS: Record<ColumnGroupId, MessageKey> = {
  identity: 'columnGroupIdentity',
  variant: 'columnGroupVariant',
  motion: 'columnGroupMotion',
  advantage: 'columnGroupAdvantage',
  attack: 'columnGroupAttack',
  bullet: 'columnGroupBullet',
  other: 'columnGroupOther',
};

export function readHiddenColumns(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((k) => typeof k === 'string'));
  } catch {
    return new Set();
  }
}

export function writeHiddenColumns(hidden: Set<string>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...hidden]));
}

export function isColumnVisible(key: string, hidden: Set<string>): boolean {
  return !hidden.has(key);
}

export function applyColumnVisibility(columns: TableColumn[], hidden: Set<string>): TableColumn[] {
  if (!hidden.size) return columns;
  return columns.filter((c) => !hidden.has(c.key));
}

export function setColumnVisible(hidden: Set<string>, key: string, visible: boolean): Set<string> {
  const next = new Set(hidden);
  if (visible) next.delete(key);
  else next.add(key);
  return next;
}

export function showAllColumns(): Set<string> {
  return new Set();
}

export function buildColumnPicker(
  hidden: Set<string>,
  onChange: (nextHidden: Set<string>) => void,
  options?: { compact?: boolean },
): HTMLElement {
  const root = document.createElement('div');
  root.className = 'column-picker' + (options?.compact ? ' column-picker-compact' : '');

  const actions = document.createElement('div');
  actions.className = 'column-picker-actions';
  const showAll = document.createElement('button');
  showAll.type = 'button';
  showAll.className = 'link-btn';
  showAll.textContent = t('columnShowAll');
  showAll.addEventListener('click', () => onChange(showAllColumns()));
  const hideAll = document.createElement('button');
  hideAll.type = 'button';
  hideAll.className = 'link-btn';
  hideAll.textContent = t('columnHideAll');
  hideAll.addEventListener('click', () => {
    onChange(new Set(ALL_COLUMN_DEFS.map((d) => d.key)));
  });
  actions.appendChild(showAll);
  actions.appendChild(hideAll);
  root.appendChild(actions);

  for (const group of Object.keys(GROUP_LABEL_KEYS) as ColumnGroupId[]) {
    const defs = ALL_COLUMN_DEFS.filter((d) => d.group === group);
    if (!defs.length) continue;

    const section = document.createElement('div');
    section.className = 'column-picker-group';
    const heading = document.createElement('div');
    heading.className = 'column-picker-group-title';
    heading.textContent = t(GROUP_LABEL_KEYS[group]);
    section.appendChild(heading);

    const grid = document.createElement('div');
    grid.className = 'column-picker-grid';
    for (const def of defs) {
      const lbl = document.createElement('label');
      lbl.className = 'check-label column-check';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = isColumnVisible(def.key, hidden);
      cb.addEventListener('change', () => {
        onChange(setColumnVisible(hidden, def.key, cb.checked));
      });
      lbl.appendChild(cb);
      lbl.appendChild(document.createTextNode(t(def.labelKey)));
      grid.appendChild(lbl);
    }
    section.appendChild(grid);
    root.appendChild(section);
  }

  return root;
}
