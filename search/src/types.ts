export type AppMode = 'compare' | 'filter' | 'character';

export interface ParsedAdvantage {
  seig: number | null;
  goG: number | null;
  tsujo: number | null;
  ch: number | null;
  min: number | null;
  max: number | null;
  raws: Record<string, string | null>;
}

export interface IndexRow {
  id: string;
  character: string;
  category: string;
  moveName: string;
  segment: string | null;
  position: string | null;
  stateName: string | null;
  command: string | null;
  lv: string | null;
  stats: Record<string, unknown>;
  parsed: {
    startup: number | null;
    total: number | null;
    active: number | null;
    blackout: number | null;
    cancelUpper: number | null;
    cancelMove: number | null;
    advantage: ParsedAdvantage;
  };
  parentStats?: Record<string, unknown>;
  parentParsed?: IndexRow['parsed'];
}

export interface SearchIndex {
  generatedAt: string;
  characterCount: number;
  rowCount: number;
  characters: string[];
  categories: string[];
  footnotes: Record<string, Record<string, string>>;
  rows: IndexRow[];
}

export type ConditionOp = '<=' | '>=' | '=' | '!=' | 'contains' | 'matches';

export interface Condition {
  field: string;
  op: ConditionOp;
  value: string;
}

import type { Locale } from './i18n';
import { sortCharacters } from './characters';
import { readHiddenColumns } from './columnVisibility';

export interface AppState {
  mode: AppMode;
  locale: Locale;
  /** Sidebar free-text search (URL: q). */
  freeQuery: string;
  /** Exact move name for compare mode (URL: move). Set via move link click. */
  moveName: string;
  partialMove: boolean;
  categories: Set<string>;
  characters: Set<string>;
  selectedCharacter: string;
  characterCategory: string;
  conditions: Condition[];
  showMissingCompare: boolean;
  sortColumn: string | null;
  sortAsc: boolean;
  sidebarCollapsed: boolean;
  hiddenColumns: Set<string>;
}

export const DEFAULT_CATEGORIES = ['通常技', '射撃技', '必殺技', 'スペルカード'];

const SIDEBAR_STORAGE_KEY = 'th123data-sidebar';

export function readSidebarCollapsed(): boolean {
  const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
  if (saved === '1') return true;
  if (saved === '0') return false;
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches;
}

export function writeSidebarCollapsed(collapsed: boolean): void {
  localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? '1' : '0');
}

export function createDefaultState(characters: string[]): AppState {
  const ordered = sortCharacters(characters);
  return {
    mode: 'character',
    locale: 'ja',
    freeQuery: '',
    moveName: '',
    partialMove: false,
    categories: new Set(['通常技']),
    characters: new Set(ordered),
    selectedCharacter: ordered[0] ?? '',
    characterCategory: '通常技',
    conditions: [],
    showMissingCompare: false,
    sortColumn: null,
    sortAsc: true,
    sidebarCollapsed: readSidebarCollapsed(),
    hiddenColumns: readHiddenColumns(),
  };
}

export function applyState(target: AppState, source: AppState): void {
  target.mode = source.mode;
  target.locale = source.locale;
  target.freeQuery = source.freeQuery;
  target.moveName = source.moveName;
  target.partialMove = source.partialMove;
  target.categories = new Set(source.categories);
  target.characters = new Set(source.characters);
  target.selectedCharacter = source.selectedCharacter;
  target.characterCategory = source.characterCategory;
  target.conditions = source.conditions.map((c) => ({ ...c }));
  target.showMissingCompare = source.showMissingCompare;
  target.sortColumn = source.sortColumn;
  target.sortAsc = source.sortAsc;
  target.sidebarCollapsed = source.sidebarCollapsed;
  target.hiddenColumns = new Set(source.hiddenColumns);
}

export function applyDefaultState(state: AppState, characters: string[]): void {
  applyState(state, createDefaultState(characters));
}
