#!/usr/bin/env node
import { getCharacterCategories } from './character_frame.mjs';
/** Normalize 必殺技 names: B版/C版/BC共通, hold variants, 地上/空中, hyphens, and parentheses. */

function normalizeParenState(label) {
  if (label === '地上版') return '地上';
  if (label === '空中版') return '空中';
  return label;
}

/** 諏訪子など: ホールド6B系（1段階）-6B（1段階） → H6B + 1段階 */
function parseHold6BMoveName(name) {
  const staged = name.match(/^ホールド6B系[（(]([12]段階)[）)]-(.+?)[（(]\1[）)]$/);
  if (staged) {
    const stage = staged[1];
    const move = staged[2];
    const baseName = move.startsWith('H') ? move : `H${move}`;
    return {
      baseName,
      variant: null,
      hold: true,
      stateLabel: stage,
      namedHoldMove: true,
      changed: true,
    };
  }

  const simple = name.match(/^ホールド6B系-(.+)$/);
  if (simple) {
    return {
      baseName: simple[1],
      variant: null,
      hold: true,
      stateLabel: null,
      namedHoldMove: true,
      changed: true,
    };
  }

  return null;
}

export function parseSpecialMoveName(name) {
  if (typeof name !== 'string' || !name) {
    return { baseName: name, variant: null, hold: false, stateLabel: null, dualPositions: null, changed: false };
  }

  const hold6b = parseHold6BMoveName(name);
  if (hold6b) return hold6b;

  let s = name;
  const stateParts = [];
  let changed = false;
  let hold = false;

  if (s.startsWith('ホールド版')) {
    hold = true;
    s = s.slice('ホールド版'.length);
    changed = true;
  } else if (s.startsWith('ホールド')) {
    hold = true;
    s = s.slice('ホールド'.length);
    changed = true;
  }

  let dualPositions = null;

  if (s.startsWith('地上空中共通')) {
    s = s.slice('地上空中共通'.length);
    changed = true;
  } else if (s.startsWith('立ちしゃがみ共通')) {
    // 立ち・しゃがみで差がないため位置にしない（地上空中共通と同様）
    s = s.slice('立ちしゃがみ共通'.length);
    changed = true;
  } else if (s.startsWith('地上空中')) {
    // 地上版・空中版の両方がある（地上空中共通=差なしとは別）
    dualPositions = ['地上', '空中'];
    s = s.slice('地上空中'.length);
    changed = true;
  } else if (s.startsWith('地上版')) {
    stateParts.push('地上');
    s = s.slice('地上版'.length);
    changed = true;
  } else if (s.startsWith('空中版')) {
    stateParts.push('空中');
    s = s.slice('空中版'.length);
    changed = true;
  } else {
    const pos = s.match(/^(地上|空中|地中)/);
    if (pos) {
      stateParts.push(pos[1]);
      s = s.slice(pos[0].length);
      changed = true;
    }
  }

  let variant = null;
  if (s.startsWith('BC共通')) {
    variant = 'BC';
    s = s.slice('BC共通'.length);
    changed = true;
  } else if (s.startsWith('B版')) {
    variant = 'B';
    s = s.slice('B版'.length);
    changed = true;
  } else if (s.startsWith('C版')) {
    variant = 'C';
    s = s.slice('C版'.length);
    changed = true;
  }

  const paren = s.match(/[（(]([^）)]+)[）)]$/);
  if (paren) {
    stateParts.push(normalizeParenState(paren[1]));
    s = s.slice(0, paren.index);
    changed = true;
  }

  const hypIdx = s.lastIndexOf('-');
  if (hypIdx > 0) {
    stateParts.push(s.slice(hypIdx + 1));
    s = s.slice(0, hypIdx);
    changed = true;
  }

  const baseName = s.trim();
  if (!variant && stateParts.at(-1) === 'Cフィニッシュ') variant = 'C';
  if (!variant && stateParts.at(-1) === 'Bフィニッシュ') variant = 'B';

  return {
    baseName,
    variant,
    hold,
    stateLabel: stateParts.length ? stateParts.at(-1) : null,
    dualPositions,
    changed: changed || !!variant || !!stateParts.length || hold || !!dualPositions,
  };
}

function variantKeys(variant, hold = false) {
  if (variant === 'BC') return ['B', 'C'];
  if (variant === 'B' || variant === 'C') return [variant];
  if (hold) return ['B', 'C'];
  return [null];
}

export function suffixCommand(command, variantKey, hold = false) {
  if (!command || !variantKey) return command ?? null;
  const s = String(command);
  if (hold) {
    if (/H[BC]$/.test(s)) return s;
    if (/[BC]$/.test(s)) return `${s.slice(0, -1)}H${s.slice(-1)}`;
    return `${s}H${variantKey}`;
  }
  if (/[BC]$/.test(s)) return s;
  return `${s}${variantKey}`;
}

function groupKey(row) {
  return `${row['技名'] ?? ''}\0${row['コマンド'] ?? ''}\0${row['Lv'] ?? ''}`;
}

function rowToStateEntry(row, stateName) {
  const { 技名, コマンド, Lv, 状態, _stateLabel, ...rest } = row;
  const entry = { 技名: stateName, ...rest };
  if (コマンド != null) entry['コマンド'] = コマンド;
  if (Lv != null) entry['Lv'] = Lv;
  return entry;
}

function buildStateParent(items) {
  const first = items[0];
  const parent = {
    技名: first['技名'],
    コマンド: first['コマンド'] ?? null,
  };
  if (first['Lv'] != null) parent['Lv'] = first['Lv'];
  const seen = new Set();
  parent['状態'] = [];
  for (const row of items) {
    const label = row._stateLabel;
    if (seen.has(label)) continue;
    seen.add(label);
    parent['状態'].push(rowToStateEntry(row, label));
  }
  return parent;
}

function applyVariantsToExistingStates(row, parsed) {
  return variantKeys(parsed.variant, parsed.hold).map((variantKey) => {
    const copy = structuredClone(row);
    copy['技名'] = parsed.baseName;
    copy['コマンド'] = suffixCommand(copy['コマンド'], variantKey, parsed.hold);
    if (Array.isArray(copy['状態'])) {
      for (const state of copy['状態']) {
        if (state['コマンド'] != null) {
          state['コマンド'] = suffixCommand(state['コマンド'], variantKey, parsed.hold);
        }
      }
    }
    return copy;
  });
}

function stateLabelsFor(parsed) {
  if (parsed.dualPositions?.length) return parsed.dualPositions;
  if (parsed.stateLabel) return [parsed.stateLabel];
  return [null];
}

function expandFlatRow(row, parsed) {
  if (parsed.namedHoldMove) {
    const copy = structuredClone(row);
    copy['技名'] = parsed.baseName;
    if (parsed.stateLabel) copy._stateLabel = parsed.stateLabel;
    return [copy];
  }

  return variantKeys(parsed.variant, parsed.hold).flatMap((variantKey) =>
    stateLabelsFor(parsed).flatMap((stateLabel) => {
      const copy = structuredClone(row);
      copy['技名'] = parsed.baseName;
      copy['コマンド'] = suffixCommand(copy['コマンド'], variantKey, parsed.hold);
      if (stateLabel) copy._stateLabel = stateLabel;
      return [copy];
    }),
  );
}

function preprocessRows(rows) {
  const out = [];
  for (const row of rows) {
    if (typeof row['技名'] !== 'string') {
      out.push(row);
      continue;
    }

    const parsed = parseSpecialMoveName(row['技名']);
    if (!parsed.changed && !row['状態']) {
      out.push(row);
      continue;
    }

    if (row['状態']) {
      out.push(...applyVariantsToExistingStates(row, parsed));
      continue;
    }

    out.push(...expandFlatRow(row, parsed));
  }
  return out;
}

function groupStateRows(rows) {
  const groups = new Map();

  for (const row of rows) {
    if (!row._stateLabel) continue;
    const key = groupKey(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  if (!groups.size) {
    return rows.map(({ _stateLabel, ...clean }) => clean);
  }

  const emitted = new Set();
  const out = [];
  for (const row of rows) {
    if (!row._stateLabel) {
      const { _stateLabel, ...clean } = row;
      out.push(clean);
      continue;
    }
    const key = groupKey(row);
    if (emitted.has(key)) continue;
    emitted.add(key);
    out.push(buildStateParent(groups.get(key)));
  }
  return out;
}

export function normalizeSpecialMoveRows(rows) {
  if (!Array.isArray(rows) || !rows.length) return rows;
  return groupStateRows(preprocessRows(rows));
}

export function normalizeCharacterSpecialMoves(char) {
  const categories = getCharacterCategories(char);

  for (const section of Object.values(categories)) {
    if (!section?.rows) continue;
    section.rows = normalizeSpecialMoveRows(section.rows);
  }
  return char;
}
