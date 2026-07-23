#!/usr/bin/env node
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
  if (parentSummary) Object.assign(merged, parentSummary);
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
  const frame = char.frameData?.['フレームデータ'];
  if (!frame) return char;

  for (const [category, section] of Object.entries(frame)) {
    if (!section?.rows) continue;
    section.rows = mergeMovesByName(section.rows);
  }
  return char;
}

export { VARIANT_BUCKETS };
