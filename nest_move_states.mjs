#!/usr/bin/env node
/** Nest hyphenated move variants (e.g. 2A-1段目) under parent move with 状態 array. */

const NESTABLE_STATE = new Set([
  '出始め',
  '持続',
  '設置',
  '発動',
  '分裂前',
  '分裂後',
  '反撃弾展開',
  '反撃弾射出',
  '当身',
  '反撃弾',
  '反撃弾(Lv4)',
]);

export function isNestableState(state) {
  return /^\d+段目$/.test(state) || NESTABLE_STATE.has(state);
}

export function isNestableBase(base) {
  if (/系$/.test(base) && !base.includes('版')) return false;
  if (/系-/.test(base)) return false;
  return true;
}

function parseMoveParts(name) {
  if (typeof name !== 'string' || !name.includes('-')) return null;
  const idx = name.lastIndexOf('-');
  const base = name.slice(0, idx);
  const state = name.slice(idx + 1);
  if (!base || !state) return null;
  return { base, state };
}

function stateSortKey(stateName) {
  const m = stateName.match(/^(\d+)段目$/);
  if (m) return Number(m[1]);
  return stateName;
}

function rowToStateEntry(row, stateName) {
  const { 技名, 状態, ...rest } = row;
  return { 技名: stateName, ...rest };
}

function buildParentRow(base, stateRows) {
  const sorted = [...stateRows].sort((a, b) => {
    const ak = stateSortKey(a.state);
    const bk = stateSortKey(b.state);
    if (typeof ak === 'number' && typeof bk === 'number') return ak - bk;
    return String(ak).localeCompare(String(bk), 'ja');
  });

  const first = sorted[0].row;
  const parent = { 技名: base };
  if (first['コマンド'] != null) parent['コマンド'] = first['コマンド'];
  if (first['Lv'] != null) parent['Lv'] = first['Lv'];
  parent['状態'] = sorted.map(({ state, row }) => rowToStateEntry(row, state));
  return parent;
}

export function nestMoveStates(rows) {
  if (!Array.isArray(rows) || !rows.length) return rows;

  const out = [];
  let i = 0;
  while (i < rows.length) {
    const row = rows[i];
    if (row['状態']) {
      out.push(row);
      i++;
      continue;
    }

    const parts = parseMoveParts(row['技名']);
    if (parts && isNestableState(parts.state) && isNestableBase(parts.base)) {
      const { base } = parts;
      const items = [];
      let j = i;
      while (j < rows.length) {
        const r = rows[j];
        if (r['状態']) break;
        const p = parseMoveParts(r['技名']);
        if (!p || p.base !== base || !isNestableState(p.state)) break;
        items.push({ state: p.state, row: r });
        j++;
      }
      if (items.length) {
        out.push(buildParentRow(base, items));
        i = j;
        continue;
      }
    }

    out.push(row);
    i++;
  }
  return out;
}

export function nestCharacterMoveStates(char) {
  const frame = char.frameData?.['フレームデータ'];
  if (!frame) return char;
  for (const section of Object.values(frame)) {
    if (!section?.rows) continue;
    section.rows = nestMoveStates(section.rows);
  }
  return char;
}
