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
  command: string | null;
  lv: string | null;
  stats: Record<string, unknown>;
  parsed: {
    startup: number | null;
    total: number | null;
    active: number | null;
    advantage: ParsedAdvantage;
  };
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

export interface AppState {
  mode: AppMode;
  moveName: string;
  partialMove: boolean;
  categories: Set<string>;
  characters: Set<string>;
  selectedCharacter: string;
  characterCategory: string;
  conditions: Condition[];
  advantagePreset: number | null;
  showMissingCompare: boolean;
  sortColumn: string | null;
  sortAsc: boolean;
}

export const DEFAULT_CATEGORIES = ['通常技', '射撃技', '必殺技', 'スペルカード'];

export function createDefaultState(characters: string[]): AppState {
  return {
    mode: 'character',
    moveName: '',
    partialMove: false,
    categories: new Set(['通常技']),
    characters: new Set(characters),
    selectedCharacter: characters[0] ?? '',
    characterCategory: '通常技',
    conditions: [],
    advantagePreset: null,
    showMissingCompare: false,
    sortColumn: null,
    sortAsc: true,
  };
}

export function applyState(target: AppState, source: AppState): void {
  target.mode = source.mode;
  target.moveName = source.moveName;
  target.partialMove = source.partialMove;
  target.categories = new Set(source.categories);
  target.characters = new Set(source.characters);
  target.selectedCharacter = source.selectedCharacter;
  target.characterCategory = source.characterCategory;
  target.conditions = source.conditions.map((c) => ({ ...c }));
  target.advantagePreset = source.advantagePreset;
  target.showMissingCompare = source.showMissingCompare;
  target.sortColumn = source.sortColumn;
  target.sortAsc = source.sortAsc;
}

export function applyDefaultState(state: AppState, characters: string[]): void {
  applyState(state, createDefaultState(characters));
}
