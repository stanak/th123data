#!/usr/bin/env node
import { getCharacterCategories } from './character_frame.mjs';
/** Merge same-name flat rows into 技名 → Lv → コマンド → {段|位置|状態} tree. */

import { isNestedMoveRow, stripMoveMeta } from './lv_utils.mjs';
import { classifyVariantLabel, VARIANT_BUCKETS } from './variant_buckets.mjs';

const PARENT_SUMMARY_KEYS = ['動作', 'キャンセル', '有利差', '備考', '攻撃Lv', '攻撃分類'];

function hasDisplayableValue(value) {
  if (value == null || value === '' || value === '-') return false;
  if (typeof value === 'object' && !Array.isArray(value)) {
    return Object.values(value).some((v) => hasDisplayableValue(v));
  }
  return true;
}

function extractParentSummary(row) {
  const summary = {};
  for (const key of PARENT_SUMMARY_KEYS) {
    const value = row[key];
    if (value != null && hasDisplayableValue(value)) summary[key] = value;
  }
  return Object.keys(summary).length ? summary : null;
}

function ensureCmdNode(tree, lv, command) {
  const lvKey = String(lv ?? '');
  const cmdKey = command ?? '';
  if (!tree[lvKey]) tree[lvKey] = {};
  if (!tree[lvKey][cmdKey]) tree[lvKey][cmdKey] = {};
  return tree[lvKey][cmdKey];
}

function addVariantLeaf(tree, lv, command, bucket, key, stats) {
  const cmdNode = ensureCmdNode(tree, lv, command);
  if (!cmdNode[bucket]) cmdNode[bucket] = {};
  cmdNode[bucket][key] = stripMoveMeta(stats);
}

function addPlainLeaf(tree, lv, command, stats) {
  const cmdNode = ensureCmdNode(tree, lv, command);
  cmdNode['_'] = stripMoveMeta(stats);
}

function flatRowLeaves(row) {
  const lv = row['Lv'] ?? '';
  const command = row['コマンド'] ?? '';
  const namePosition = row._namePosition ?? null;
  const nameState = row._nameState ?? null;

  if (Array.isArray(row['状態']) && row['状態'].length) {
    return row['状態'].map((state) => {
      const label = state['技名'] ?? '_';
      const classified = classifyVariantLabel(label);
      if (classified) {
        return { lv, command, bucket: classified.bucket, key: classified.key, stats: state };
      }
      return { lv, command, bucket: null, key: '_', stats: state };
    });
  }

  if (namePosition) {
    return [{ lv, command, bucket: '位置', key: namePosition, stats: row }];
  }
  if (nameState) {
    return [{ lv, command, bucket: '状態', key: nameState, stats: row }];
  }
  return [{ lv, command, bucket: null, key: '_', stats: row }];
}

function rowToStateEntry(row, stateName) {
  const copy = stripFlatMeta(row);
  delete copy['技名'];
  delete copy['状態'];
  return { 技名: stateName, ...copy };
}

function stripFlatMeta(row) {
  const copy = structuredClone(row);
  delete copy._namePosition;
  delete copy._nameState;
  delete copy.Lv;
  delete copy['コマンド'];
  return copy;
}

function variantLabelFromRow(row) {
  if (row._namePosition) return row._namePosition;
  if (row._nameState) return row._nameState;
  return null;
}

function unwrapNestedFlatRow(row) {
  if (!isNestedMoveRow(row)) return row;
  const lvTree = row['Lv'];
  if (Object.keys(lvTree).some((k) => k !== '')) return row;

  const cmdTree = lvTree[''];
  if (!cmdTree || Object.keys(cmdTree).some((k) => k !== '')) return row;

  const node = cmdTree[''];
  if (!node) return stripFlatMeta(row);

  const states = [];
  for (const bucket of VARIANT_BUCKETS) {
    if (!node[bucket]) continue;
    for (const [key, stats] of Object.entries(node[bucket])) {
      const label = bucket === '段' ? `${key}段目` : key;
      states.push({ 技名: label, ...stats });
    }
  }

  if (node['_']) {
    const flat = stripFlatMeta({ 技名: row['技名'], ...node['_'] });
    const summary = extractParentSummary(row);
    if (summary) Object.assign(flat, summary);
    if (Array.isArray(row['状態']) && row['状態'].length) flat['状態'] = row['状態'];
    else if (states.length) flat['状態'] = states;
    return flat;
  }

  if (states.length) {
    const parent = stripFlatMeta(row);
    parent['状態'] = row['状態'] ?? states;
    const summary = extractParentSummary(row);
    if (summary) Object.assign(parent, summary);
    return parent;
  }

  return stripFlatMeta(row);
}

function buildFlatMove(name, rows) {
  if (rows.length === 1) {
    const row = rows[0];
    if (!row._namePosition && !row._nameState) {
      return stripFlatMeta(row);
    }
  }

  const states = [];
  let parentSummary = null;
  for (const row of rows) {
    if (Array.isArray(row['状態']) && row['状態'].length) {
      states.push(...row['状態'].map((state) => structuredClone(state)));
    } else {
      const variant = variantLabelFromRow(row);
      states.push(rowToStateEntry(row, variant ?? row['技名'] ?? name));
    }
    const summary = extractParentSummary(row);
    if (summary) parentSummary = summary;
  }

  const parent = { 技名: name, 状態: states };
  if (parentSummary) Object.assign(parent, parentSummary);
  return parent;
}

/** Merge same-name rows for non-special categories without Lv/コマンド nesting. */
export function mergeFlatMovesByName(rows) {
  if (!Array.isArray(rows) || !rows.length) return rows;

  const groups = new Map();
  const order = [];
  const passthrough = [];

  for (const row of rows) {
    if (isNestedMoveRow(row)) {
      const flat = unwrapNestedFlatRow(row);
      const name = flat['技名'];
      if (!name) {
        passthrough.push(flat);
        continue;
      }
      if (!groups.has(name)) {
        groups.set(name, []);
        order.push(name);
      }
      groups.get(name).push(flat);
      continue;
    }
    const name = row['技名'];
    if (!name) {
      passthrough.push(row);
      continue;
    }
    if (!groups.has(name)) {
      groups.set(name, []);
      order.push(name);
    }
    groups.get(name).push(row);
  }

  const out = [];
  for (const name of order) {
    out.push(buildFlatMove(name, groups.get(name)));
  }
  out.push(...passthrough);
  return out;
}

function distinctCommands(rows) {
  const commands = new Set();
  for (const row of rows) {
    const cmd = row['コマンド'];
    if (cmd != null && cmd !== '') commands.add(String(cmd));
  }
  return commands;
}

function buildMoveTree(name, rows) {
  const tree = {};
  let parentSummary = null;
  for (const row of rows) {
    for (const leaf of flatRowLeaves(row)) {
      if (leaf.bucket) {
        addVariantLeaf(tree, leaf.lv, leaf.command, leaf.bucket, leaf.key, leaf.stats);
      } else {
        addPlainLeaf(tree, leaf.lv, leaf.command, leaf.stats);
      }
    }
    const summary = extractParentSummary(row);
    if (summary) parentSummary = summary;
  }
  const merged = { 技名: name, Lv: tree };
  // B/C でコマンドが分かれる場合、片方の親性能をトップレベルに載せない
  if (parentSummary && distinctCommands(rows).size <= 1) {
    Object.assign(merged, parentSummary);
  }
  return merged;
}

export function mergeMovesByName(rows) {
  if (!Array.isArray(rows) || !rows.length) return rows;

  const groups = new Map();
  const order = [];
  const passthrough = [];

  for (const row of rows) {
    if (isNestedMoveRow(row)) {
      passthrough.push(row);
      continue;
    }
    const name = row['技名'];
    if (!name) {
      passthrough.push(row);
      continue;
    }
    if (!groups.has(name)) {
      groups.set(name, []);
      order.push(name);
    }
    groups.get(name).push(row);
  }

  const out = [];
  for (const name of order) {
    out.push(buildMoveTree(name, groups.get(name)));
  }
  out.push(...passthrough);
  return out;
}

export function mergeCharacterMovesByName(char) {
  const categories = getCharacterCategories(char);

  for (const [category, section] of Object.entries(categories)) {
    if (!section?.rows) continue;
    section.rows = category === '必殺技'
      ? mergeMovesByName(section.rows)
      : mergeFlatMovesByName(section.rows);
  }
  return char;
}

export { VARIANT_BUCKETS };
