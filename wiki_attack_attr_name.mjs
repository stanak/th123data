/** Wiki 技表の技名 → frame_data 技名 */

import { normalizeMoveName } from './normalize_move.mjs';

const WIKI_MOVE_ALIASES = {
  '至る所に青山あり': '至る処に青山あり',
  '物質と反物質の境界': '物質と反物質の宇宙',
  'フィールドウルトラバイトレット': 'フィールドウルトラバイオレット',
  '人形火葬': '人形火操',
  '鳳紋蝶の槍': '鳳蝶紋の槍',
  '六震-相': '六震-相-',
  '白昼の明るすぎる星': '客星の明るすぎる夜',
  '離円花冠（カローラヴィジョン）': 'カローラヴィジョン',
  '喪心喪意（ディモチヴェイション）': 'ディモチヴェイション',
  '近眼花火（マインドスターマイン）': 'マインドスターマイン',
  '花冠視線（クラウンヴィジョン）': 'クラウンヴィジョン',
  '喪心創痍（ディスカーダー）': 'ディスカーダー',
  '超短脳波（エックスウェイブ）': 'エックスウェイブ',
  '望見円月（ルナティックブラスト）': 'ルナティックブラスト',
  '幻朧月睨（ルナティックレッドアイズ）': 'ルナティックレッドアイズ',
};

export function extractQuotedMoveName(name) {
  let s = String(name ?? '').replace(/\n/g, '').trim();
  const quoted = s.match(/[「『]([^」』]+)[」』]/);
  if (quoted) return quoted[1].trim();
  return s;
}

export function normalizeWikiAttackAttrMoveName(name) {
  let s = extractQuotedMoveName(name)
    .replace(/\u3000/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\(\*\d+\)/g, '')
    .replace(/-+$/g, '')
    .trim();
  s = WIKI_MOVE_ALIASES[s] ?? s;
  return normalizeMoveName(s);
}

export function wikiAttackAttrNameVariants(name) {
  const variants = new Set();
  const quoted = extractQuotedMoveName(name);
  variants.add(quoted);
  const paren = quoted.match(/^(.+?)（([^）]+)）$/) ?? quoted.match(/^(.+?)\(([^)]+)\)$/);
  if (paren) {
    variants.add(paren[1].trim());
    variants.add(paren[2].trim());
  }
  const inlineParen = String(name).match(/（([^）]+)）/);
  if (inlineParen) variants.add(inlineParen[1].trim());
  const normalized = new Set();
  for (const variant of variants) {
    normalized.add(normalizeWikiAttackAttrMoveName(variant));
  }
  return [...normalized];
}

export function normalizeAttackAttrLookupKey(name) {
  return normalizeWikiAttackAttrMoveName(name).replace(/ /g, '');
}
