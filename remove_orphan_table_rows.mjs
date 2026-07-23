#!/usr/bin/env node
/** Drop wiki table scrape rows that have no move name or frame data. */

import { getCharacterCategories } from './character_frame.mjs';

const ALLOWED_ORPHAN_KEYS = new Set([
  'コマンド',
  '相手キャラ',
  '対立ち',
  '対しゃがみ',
  'B版',
  'C版',
  '坤神招来 罠',
  '正G',
  '誤G',
  '通常',
  'CH',
  'しゃがみガード',
  '立ちガード',
  'ヒット数',
  'Lv1',
  'Lv2',
  'Lv3',
  'Lv4',
  '持続時間',
  '風起こしレベル',
  '+1弾',
  'アイシクルシュート',
  '最大弾数',
  '虎勁',
  'スキルLv＼弾数',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
]);

function hasMoveFrameData(row) {
  return !!(
    row['動作']
    || row['攻撃Lv']
    || row['攻撃分類']
    || row['Lv']
    || row['状態']
    || row['受身不能']
    || row['備考']
    || row['キャンセル']
    || row['ヒットストップ']
  );
}

function isScalarAdvantage(value) {
  if (value == null) return false;
  if (typeof value === 'string' || typeof value === 'number') return true;
  if (typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value).every(
    (v) => typeof v === 'string' || typeof v === 'number' || v == null,
  );
}

export function isOrphanTableRow(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return false;
  if (row['技名'] || row['行動の種類'] || row['Lv'] || row['状態']) return false;
  if (hasMoveFrameData(row)) return false;

  if (row['有利差'] != null && isScalarAdvantage(row['有利差'])) return false;

  if (row['コマンド'] != null) return true;

  const hasTableShape =
    row['相手キャラ'] != null
    || row['対立ち'] != null
    || row['対しゃがみ'] != null
    || row['B版'] != null
    || row['C版'] != null
    || row['坤神招来 罠'] != null
    || row['正G'] != null
    || row['誤G'] != null
    || row['通常'] != null
    || row['CH'] != null
    || row['しゃがみガード'] != null
    || row['立ちガード'] != null
    || row['ヒット数'] != null
    || row['持続時間'] != null
    || row['風起こしレベル'] != null
    || row['虎勁'] != null
    || row['アイシクルシュート'] != null
    || row['最大弾数'] != null
    || row['スキルLv＼弾数'] != null
    || row['Lv1'] != null
    || row['+1弾'] != null;
  if (!hasTableShape) return false;

  return Object.keys(row).every((key) => ALLOWED_ORPHAN_KEYS.has(key));
}

export function removeOrphanTableRows(rows) {
  if (!Array.isArray(rows)) return rows;
  return rows.filter((row) => !isOrphanTableRow(row));
}

export function removeCharacterOrphanTableRows(char) {
  const categories = getCharacterCategories(char);
  for (const section of Object.values(categories)) {
    if (!section?.rows) continue;
    section.rows = removeOrphanTableRows(section.rows);
  }
  return char;
}
