#!/usr/bin/env node
/** Strip 地上版/空中版/地中版 from 技名; route into 位置 at merge time. */

import { normalizePositionLabel } from './variant_buckets.mjs';

const SKIP_CATEGORIES = new Set(['射撃技']);

/** @returns {{ baseName: string, position: string|null, stateFromName: string|null, changed: boolean }} */
export function parseMoveNamePosition(name) {
  if (typeof name !== 'string' || !name) {
    return { baseName: name, position: null, stateFromName: null, changed: false };
  }

  let s = name.trim();
  let position = null;
  let stateFromName = null;
  let changed = false;

  const paren = s.match(/[（(](地上版|空中版|地中版|立ち版|しゃがみ版)[）)]/);
  if (paren) {
    position = normalizePositionLabel(paren[1]);
    s = s.slice(0, paren.index) + s.slice(paren.index + paren[0].length);
    changed = true;
  }

  if (!position) {
    if (s.startsWith('地上版')) {
      position = '地上';
      s = s.slice('地上版'.length);
      changed = true;
    } else if (s.startsWith('空中版')) {
      position = '空中';
      s = s.slice('空中版'.length);
      changed = true;
    } else if (s.startsWith('地中版')) {
      position = '地中';
      s = s.slice('地中版'.length);
      changed = true;
    } else {
      const prefix = s.match(/^(地上|空中|地中)/);
      if (prefix && !s.match(/^(地上|空中|地中)[A-Z]/)) {
        position = prefix[1];
        s = s.slice(prefix[0].length);
        changed = true;
      }
    }
  }

  const hypIdx = s.lastIndexOf('-');
  if (hypIdx > 0) {
    stateFromName = s.slice(hypIdx + 1);
    s = s.slice(0, hypIdx);
    changed = true;
  }

  return { baseName: s.trim(), position, stateFromName, changed };
}

export function normalizeMovePositionRows(rows) {
  if (!Array.isArray(rows) || !rows.length) return rows;

  return rows.map((row) => {
    if (typeof row['技名'] !== 'string') return row;
    const parsed = parseMoveNamePosition(row['技名']);
    if (!parsed.changed) return row;

    const copy = structuredClone(row);
    copy['技名'] = parsed.baseName;
    if (parsed.position) copy._namePosition = parsed.position;
    if (parsed.stateFromName) copy._nameState = parsed.stateFromName;
    return copy;
  });
}

export function normalizeCharacterMovePosition(char) {
  const frame = char.frameData?.['フレームデータ'];
  if (!frame) return char;

  for (const [category, section] of Object.entries(frame)) {
    if (SKIP_CATEGORIES.has(category) || !section?.rows) continue;
    section.rows = normalizeMovePositionRows(section.rows);
  }
  return char;
}
