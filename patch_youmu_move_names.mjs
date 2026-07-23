#!/usr/bin/env node
/** 妖夢: wiki表記の屈A系を標準の 2A に統一。 */

import { getCharacterCategories } from './character_frame.mjs';
import { dedupeRows } from './dedupe_rows.mjs';

export const YOUMU_MOVE_RENAMES = {
  近屈A: '2A',
  遠屈A: '2A',
  '1A': '2A',
};

function renameRow(row) {
  if (typeof row['技名'] === 'string' && row['技名'] in YOUMU_MOVE_RENAMES) {
    row['技名'] = YOUMU_MOVE_RENAMES[row['技名']];
  }
  if (Array.isArray(row['状態'])) {
    for (const state of row['状態']) renameRow(state);
  }
}

export function patchYoumuMoveNames(char, characterName) {
  if (characterName !== '妖夢') return char;
  for (const section of Object.values(getCharacterCategories(char))) {
    if (!section?.rows) continue;
    for (const row of section.rows) renameRow(row);
    section.rows = dedupeRows(section.rows);
  }
  return char;
}

export function renameYoumuMoveLabel(name) {
  return YOUMU_MOVE_RENAMES[name] ?? name;
}
