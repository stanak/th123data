export type Locale = 'ja' | 'en';
export type AdvantageKey = '正G' | '誤G' | '通常' | 'CH';

export const ADVANTAGE_KEYS: AdvantageKey[] = ['正G', '誤G', '通常', 'CH'];

export const ADVANTAGE_CONDITION_FIELDS = ADVANTAGE_KEYS.map((key) => `有利差.${key}`);

const STORAGE_KEY = 'th123data-locale';

/** hibimato 天則用語対応表: https://hibimato.seesaa.net/article/445952959.html */
const ADVANTAGE_EN: Record<AdvantageKey, string> = {
  '正G': 'rightblock',
  '誤G': 'wrongblock',
  '通常': 'block',
  CH: 'counter hit',
};

const CATEGORY_EN: Record<string, string> = {
  '通常技': 'melee',
  '射撃技': 'bullets',
  '必殺技': 'special',
  'スペルカード': 'spell cards',
};

const ATTACK_CLASS_EN: Record<string, string> = {
  '上段': 'mid',
  '中段': 'overhead',
  '下段': 'low',
};

const ATTACK_LV_EN: Record<string, string> = {
  '小': 'small',
  '中': 'mid',
  '大': 'large',
  '特大': 'ex.large',
};

const FIELD_PATH_EN: Record<string, string> = {
  '有利差.正G': 'frame adv (rightblock)',
  '有利差.誤G': 'frame adv (wrongblock)',
  '有利差.通常': 'frame adv (block)',
  '有利差.CH': 'frame adv (counter hit)',
  '有利差.*': 'frame advantage.*',
  '動作.発生': 'startup',
  '動作.全体': 'total',
  '動作.持続': 'active',
  '動作.暗転': 'screen blackout',
  'キャンセル.上位': 'cancel (higher)',
  'キャンセル.移動': 'cancel (move)',
  '技名': 'move',
  '状態': 'state',
  'コマンド': 'command',
  '攻撃Lv': 'attack Lv',
};

const JA = {
  siteTitle: 'TH123 Frame Data',
  mode: 'モード',
  modeCharacter: 'キャラ別',
  modeCompare: '技名比較',
  modeFilter: '条件検索',
  character: 'キャラクター',
  charFilter: 'キャラフィルタ',
  selectAll: '全選択',
  selectNone: '全解除',
  category: 'カテゴリ',
  categoryCompareHint: 'カテゴリ（比較/検索用）',
  moveName: '技名',
  moveNamePlaceholder: '例: 4A',
  partialMatch: '部分一致',
  showMissingChars: '該当なしキャラも表示',
  advantagePreset: '有利差プリセット',
  clear: 'クリア',
  customCondition: 'カスタム条件',
  valuePlaceholder: '値',
  add: '追加',
  metaInfo: '{chars}キャラ / {rows}行',
  compareTitle: '技名比較',
  compareTitleNamed: '技名比較: {move}',
  partialSuffix: ' (部分一致)',
  compareHint: 'サイドバーで技名を入力してください（例: 4A）',
  filterTitle: '条件検索',
  resultCount: '{count}件',
  resultCountTotal: '{count}件 / 全{total}行',
  characterFrameData: '{name} — フレームデータ',
  footnotes: '脚注',
  emptyResults: '該当する技がありません',
  emptyCategory: 'このカテゴリに該当する技がありません',
  colCharacter: 'キャラ',
  colCategory: 'カテゴリ',
  colMoveName: '技名',
  colSegment: '段',
  colPosition: '位置',
  colState: '状態',
  colCommand: 'コマンド',
  colLv: 'Lv',
  colStartup: '発生',
  colTotal: '全体',
  colActive: '持続',
  colBlackout: '暗転',
  colCancelUpper: '上位',
  colCancelMove: '移動',
  colAdvTsujo: '有利差(通常)',
  colAdvSeig: '有利差(正G)',
  colAdvGoG: '有利差(誤G)',
  colAdvCh: '有利差(CH)',
  colAttackLv: '攻撃Lv',
  colAttackClass: '攻撃分類',
  colNotes: '備考',
  colSpecialNotes: '特記事項',
  colLvUpEffect: '追加効果',
  colSousaiStrength: '相殺強度',
  colSousaiCount: '相殺回数',
  colGrazeDurability: 'グレイズ耐久数',
  colHitCount: 'ヒット数',
  colBulletNotes: '射撃備考',
  columnVisibility: '表示列',
  columnShowAll: 'すべて表示',
  columnHideAll: 'すべて非表示',
  columnGroupIdentity: '基本',
  columnGroupVariant: 'バリアント',
  columnGroupMotion: '動作',
  columnGroupAdvantage: '有利差',
  columnGroupAttack: '攻撃',
  columnGroupBullet: '射撃早見',
  columnGroupOther: 'その他',
  sidebarShow: 'サイドバーを表示',
  sidebarHide: 'サイドバーを隠す',
  colMatchedAdv: '一致した有利差',
  notesOpen: 'クリックで備考を表示',
  specialNotesOpen: 'クリックで特記事項を表示',
  specialNotesTableSummary: '表（{count}件）',
  notesClose: '閉じる',
  expandVariants: 'クリックで展開',
  collapseVariants: 'クリックで畳む',
  langJa: '日本語',
  langEn: 'English',
  loadError: 'search_index.json の読み込みに失敗しました',
  pageTitle: 'TH123 フレームデータ検索',
} as const;

export type MessageKey = keyof typeof JA;

const EN: Record<MessageKey, string> = {
  siteTitle: 'TH123 Frame Data',
  mode: 'Mode',
  modeCharacter: 'By character',
  modeCompare: 'Compare moves',
  modeFilter: 'Filter',
  character: 'Character',
  charFilter: 'Character filter',
  selectAll: 'Select all',
  selectNone: 'Select none',
  category: 'Category',
  categoryCompareHint: 'Category (compare/filter)',
  moveName: 'Move',
  moveNamePlaceholder: 'e.g. 4A',
  partialMatch: 'Partial match',
  showMissingChars: 'Show characters without data',
  advantagePreset: 'Frame advantage preset',
  clear: 'Clear',
  customCondition: 'Custom condition',
  valuePlaceholder: 'value',
  add: 'Add',
  metaInfo: '{chars} chars / {rows} rows',
  compareTitle: 'Compare moves',
  compareTitleNamed: 'Compare: {move}',
  partialSuffix: ' (partial)',
  compareHint: 'Enter a move name in the sidebar (e.g. 4A)',
  filterTitle: 'Filter',
  resultCount: '{count} results',
  resultCountTotal: '{count} / {total} rows',
  characterFrameData: '{name} — frame data',
  footnotes: 'Footnotes',
  emptyResults: 'No matching moves',
  emptyCategory: 'No moves in this category',
  colCharacter: 'Character',
  colCategory: 'Category',
  colMoveName: 'Move',
  colSegment: 'Hit',
  colPosition: 'Position',
  colState: 'State',
  colCommand: 'Command',
  colLv: 'Lv',
  colStartup: 'startup',
  colTotal: 'total',
  colActive: 'active',
  colBlackout: 'screen blackout',
  colCancelUpper: 'cancel (higher)',
  colCancelMove: 'cancel (move)',
  colAdvTsujo: 'frame adv (block)',
  colAdvSeig: 'frame adv (rightblock)',
  colAdvGoG: 'frame adv (wrongblock)',
  colAdvCh: 'frame adv (counter hit)',
  colAttackLv: 'attack Lv',
  colAttackClass: 'attack class',
  colNotes: 'notes',
  colSpecialNotes: 'special notes',
  colLvUpEffect: 'Lv-up bonus',
  colSousaiStrength: 'trade strength',
  colSousaiCount: 'trade count',
  colGrazeDurability: 'graze durability',
  colHitCount: 'hit count',
  colBulletNotes: 'bullet notes',
  columnVisibility: 'Columns',
  columnShowAll: 'Show all',
  columnHideAll: 'Hide all',
  columnGroupIdentity: 'Basic',
  columnGroupVariant: 'Variants',
  columnGroupMotion: 'Motion',
  columnGroupAdvantage: 'Frame adv',
  columnGroupAttack: 'Attack',
  columnGroupBullet: 'Bullet chart',
  columnGroupOther: 'Other',
  sidebarShow: 'Show sidebar',
  sidebarHide: 'Hide sidebar',
  colMatchedAdv: 'matched frame adv',
  notesOpen: 'Click to view notes',
  specialNotesOpen: 'Click to view special notes',
  specialNotesTableSummary: 'Table ({count})',
  notesClose: 'Close',
  expandVariants: 'Click to expand',
  collapseVariants: 'Click to collapse',
  langJa: '日本語',
  langEn: 'English',
  loadError: 'Failed to load search_index.json',
  pageTitle: 'TH123 Frame Data Search',
};

const MESSAGES: Record<Locale, Record<MessageKey, string>> = { ja: JA, en: EN };

let locale: Locale = 'ja';

export function getLocale(): Locale {
  return locale;
}

export function detectLocale(): Locale {
  const params = new URLSearchParams(location.search);
  const fromUrl = params.get('lang');
  if (fromUrl === 'en' || fromUrl === 'ja') return fromUrl;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'ja') return stored;
  return navigator.language.startsWith('ja') ? 'ja' : 'en';
}

export function setLocale(next: Locale): void {
  locale = next;
  localStorage.setItem(STORAGE_KEY, next);
  document.documentElement.lang = next;
  document.title = t('pageTitle');
}

export function initLocale(initial?: Locale): void {
  setLocale(initial ?? detectLocale());
}

export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  let text = MESSAGES[locale][key] ?? JA[key];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}

export function categoryLabel(category: string): string {
  if (locale === 'ja') return category;
  return CATEGORY_EN[category] ?? category;
}

export function advantageTypeLabel(key: AdvantageKey): string {
  if (locale === 'ja') return key;
  return ADVANTAGE_EN[key];
}

export function advantageColumnLabel(key: AdvantageKey): string {
  return advantageTypeLabel(key);
}

export function fieldPathLabel(field: string): string {
  if (locale === 'ja') return field;
  return FIELD_PATH_EN[field] ?? field;
}

export function displayCellValue(field: string, value: string): string {
  if (!value || locale === 'ja') return value;
  if (field === '攻撃分類') return ATTACK_CLASS_EN[value] ?? value;
  if (field === '攻撃Lv') return ATTACK_LV_EN[value] ?? value;
  return value;
}

export function formatMatchedAdvantage(parts: { key: AdvantageKey; raw: string }[]): string {
  if (locale === 'ja') {
    return parts.map(({ key, raw }) => `${key}:${raw}`).join(' ');
  }
  return parts.map(({ key, raw }) => `${advantageTypeLabel(key)}:${raw}`).join(' ');
}
