import { t, fieldPathLabel, type MessageKey } from './i18n';

/** Maps table column labels to getStat field paths for custom conditions. */
export interface ConditionFieldDef {
  field: string;
  labelKey: MessageKey;
}

export const CONDITION_FIELD_DEFS: ConditionFieldDef[] = [
  { field: 'キャラ', labelKey: 'colCharacter' },
  { field: 'カテゴリ', labelKey: 'colCategory' },
  { field: '技名', labelKey: 'colMoveName' },
  { field: '段', labelKey: 'colSegment' },
  { field: '位置', labelKey: 'colPosition' },
  { field: '状態', labelKey: 'colState' },
  { field: 'コマンド', labelKey: 'colCommand' },
  { field: 'Lv', labelKey: 'colLv' },
  { field: '動作.発生', labelKey: 'colStartup' },
  { field: '動作.全体', labelKey: 'colTotal' },
  { field: '動作.持続', labelKey: 'colActive' },
  { field: '動作.暗転', labelKey: 'colBlackout' },
  { field: 'キャンセル.上位', labelKey: 'colCancelUpper' },
  { field: 'キャンセル.移動', labelKey: 'colCancelMove' },
  { field: '有利差.正G', labelKey: 'colAdvSeig' },
  { field: '有利差.誤G', labelKey: 'colAdvGoG' },
  { field: '有利差.通常', labelKey: 'colAdvTsujo' },
  { field: '有利差.CH', labelKey: 'colAdvCh' },
  { field: '攻撃Lv', labelKey: 'colAttackLv' },
  { field: '攻撃分類', labelKey: 'colAttackClass' },
  { field: '攻撃属性', labelKey: 'colAttackAttribute' },
  { field: 'ヒット数', labelKey: 'colHitCount' },
  { field: '相殺強度', labelKey: 'colSousaiStrength' },
  { field: '相殺回数', labelKey: 'colSousaiCount' },
  { field: 'グレイズ耐久数', labelKey: 'colGrazeDurability' },
  { field: '射撃備考', labelKey: 'colBulletNotes' },
  { field: '備考', labelKey: 'colNotes' },
  { field: '特記事項', labelKey: 'colSpecialNotes' },
  { field: '追加効果', labelKey: 'colLvUpEffect' },
];

const FIELD_LABEL_KEYS = new Map(CONDITION_FIELD_DEFS.map((d) => [d.field, d.labelKey]));

export function conditionFieldLabel(field: string): string {
  const key = FIELD_LABEL_KEYS.get(field);
  return key ? t(key) : fieldPathLabel(field);
}
