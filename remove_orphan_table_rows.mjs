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
]);

export function isOrphanTableRow(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return false;
  if (row['技名'] || row['行動の種類'] || row['Lv']) return false;
  if (row['動作'] || row['攻撃Lv'] || row['攻撃分類'] || row['有利差']) return false;
  if (row['ヒットストップ'] || row['受身不能'] || row['キャンセル'] || row['備考']) return false;

  const hasTableShape =
    row['相手キャラ'] != null ||
    row['対立ち'] != null ||
    row['対しゃがみ'] != null ||
    row['B版'] != null ||
    row['C版'] != null ||
    row['坤神招来 罠'] != null;
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
