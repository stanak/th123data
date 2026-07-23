#!/usr/bin/env node
/** Shared Lv parsing and move-tree helpers. */

export function normalizeLvString(lv) {
  return typeof lv === 'string' ? lv.replace(/～/g, '~') : lv;
}

/** @returns {Array<number|string>|null} */
export function parseLvLevels(lv) {
  const normalized = normalizeLvString(lv);
  if (normalized == null || normalized === '') return null;
  if (normalized.includes('~')) {
    const [start, end] = normalized.split('~').map(Number);
    if (Number.isNaN(start) || Number.isNaN(end)) return [normalized];
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }
  const n = Number(normalized);
  return Number.isNaN(n) ? [normalized] : [n];
}

export function formatLvRange(levels) {
  if (!levels?.length) return '';
  if (levels.length === 1) return String(levels[0]);
  let start = levels[0];
  let end = levels[0];
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] === end + 1) {
      end = levels[i];
    } else {
      break;
    }
  }
  if (start === end) return String(start);
  return `${start}~${end}`;
}

const MOVE_META_KEYS = new Set(['技名', 'Lv', 'コマンド', '状態']);

export function stripMoveMeta(stats) {
  if (!stats || typeof stats !== 'object') return stats;
  const out = {};
  for (const [k, v] of Object.entries(stats)) {
    if (!MOVE_META_KEYS.has(k)) out[k] = v;
  }
  return out;
}

export function isNestedMoveRow(row) {
  return row?.['Lv'] != null && typeof row['Lv'] === 'object' && !Array.isArray(row['Lv']);
}

export function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

export function statsFingerprint(stats) {
  return stableStringify(stripMoveMeta(stats));
}

export function stateSortKey(stateName) {
  if (stateName == null || stateName === '_') return -1;
  const m = String(stateName).match(/^(\d+)段目$/);
  if (m) return Number(m[1]);
  return String(stateName);
}

/** Collapse consecutive numeric Lvs with identical stats into ranges. */
export function collapseLvEntries(entries) {
  if (!entries.length) return [];
  const sorted = [...entries].sort((a, b) => a.lv - b.lv);
  const out = [];
  let i = 0;
  while (i < sorted.length) {
    const fp = statsFingerprint(sorted[i].stats);
    const run = [sorted[i]];
    let j = i + 1;
    while (
      j < sorted.length &&
      statsFingerprint(sorted[j].stats) === fp &&
      sorted[j].lv === run[run.length - 1].lv + 1
    ) {
      run.push(sorted[j]);
      j++;
    }
    out.push({
      ...sorted[i],
      lvDisplay: formatLvRange(run.map((e) => e.lv)),
      lvValues: run.map((e) => e.lv),
    });
    i = j;
  }
  return out;
}
