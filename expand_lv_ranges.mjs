#!/usr/bin/env node
/** Expand Lv ranges (e.g. 1~2) into individual integer Lv rows before move merge. */

import { isNestedMoveRow, parseLvLevels } from './lv_utils.mjs';

const SKIP_CATEGORIES = new Set(['射撃技']);

function cloneWithLv(row, lvStr) {
  const copy = structuredClone(row);
  copy['Lv'] = lvStr;
  if (Array.isArray(copy['状態'])) {
    copy['状態'] = copy['状態'].map((state) => {
      const stateCopy = structuredClone(state);
      stateCopy['Lv'] = lvStr;
      return stateCopy;
    });
  }
  return copy;
}

export function expandRowLv(row) {
  if (isNestedMoveRow(row)) return [row];
  const levels = parseLvLevels(row['Lv']);
  if (!levels || levels.length <= 1) {
    if (levels?.length === 1 && typeof levels[0] === 'number') {
      return [cloneWithLv(row, String(levels[0]))];
    }
    return [row];
  }
  return levels.map((lv) => cloneWithLv(row, String(lv)));
}

export function expandLvRanges(rows) {
  if (!Array.isArray(rows) || !rows.length) return rows;
  return rows.flatMap(expandRowLv);
}

export function expandCharacterLvRanges(char) {
  const frame = char.frameData?.['フレームデータ'];
  if (!frame) return char;

  for (const [category, section] of Object.entries(frame)) {
    if (SKIP_CATEGORIES.has(category) || !section?.rows) continue;
    section.rows = expandLvRanges(section.rows);
  }
  return char;
}
