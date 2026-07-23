#!/usr/bin/env node
/** Merge 攻撃Lv/攻撃分類 from bare command nodes (421) into BC variants (421B/C), then drop bare keys. */

import { getCharacterCategories } from './character_frame.mjs';
import { isNestedMoveRow } from './lv_utils.mjs';
import { VARIANT_BUCKETS } from './variant_buckets.mjs';

const TARGET_CATEGORY = '必殺技';

function isBareCommandKey(key) {
  return /^\d+$/.test(key);
}

export function isBcVariantOfBare(bareKey, commandKey) {
  if (commandKey === '追加効果') return false;
  return new RegExp(`^${bareKey}H?[BC]$`).test(commandKey);
}

function hasMeaningfulAttackInfo(stats) {
  if (!stats || typeof stats !== 'object') return false;
  const lv = stats['攻撃Lv'];
  const cls = stats['攻撃分類'];
  return (lv != null && lv !== '' && lv !== '-') || (cls != null && cls !== '' && cls !== '-');
}

function needsAttackInfo(stats) {
  if (!stats || typeof stats !== 'object') return false;
  const lvMissing = stats['攻撃Lv'] == null || stats['攻撃Lv'] === '' || stats['攻撃Lv'] === '-';
  const clsMissing = stats['攻撃分類'] == null || stats['攻撃分類'] === '' || stats['攻撃分類'] === '-';
  return lvMissing || clsMissing;
}

export function applyAttackInfoIfMissing(target, source) {
  if (!target || !source) return;
  for (const key of ['攻撃Lv', '攻撃分類']) {
    const sv = source[key];
    if (sv == null || sv === '' || sv === '-') continue;
    const tv = target[key];
    if (tv == null || tv === '' || tv === '-') target[key] = sv;
  }
}

export function collectStatsLeaves(cmdNode) {
  const out = [];
  if (!cmdNode || typeof cmdNode !== 'object' || Array.isArray(cmdNode)) return out;

  if (cmdNode['_'] && typeof cmdNode['_'] === 'object') {
    out.push({ path: '_', bucket: null, key: null, stats: cmdNode['_'] });
  }

  for (const bucket of VARIANT_BUCKETS) {
    const bucketNode = cmdNode[bucket];
    if (!bucketNode || typeof bucketNode !== 'object') continue;
    for (const [key, stats] of Object.entries(bucketNode)) {
      if (stats && typeof stats === 'object') {
        out.push({ path: `${bucket}/${key}`, bucket, key, stats });
      }
    }
  }

  return out;
}

export function findMatchingBareLeaf(bareLeaves, bcLeaf) {
  const exact = bareLeaves.find((b) => b.path === bcLeaf.path);
  if (exact) return exact;

  if (bcLeaf.bucket === '状態') {
    const fuzzy = bareLeaves.find(
      (b) =>
        b.bucket === '状態'
        && (b.key.startsWith(bcLeaf.key) || bcLeaf.key.startsWith(b.key)),
    );
    if (fuzzy) return fuzzy;
  }

  const bareUnderscore = bareLeaves.find((b) => b.path === '_');
  if (bareUnderscore) return bareUnderscore;

  if (bcLeaf.path === '_') {
    const meaningful = bareLeaves.filter((b) => hasMeaningfulAttackInfo(b.stats));
    if (meaningful.length === 1) return meaningful[0];
    if (meaningful.length > 1) {
      const sig = (leaf) => `${leaf.stats['攻撃Lv']}|${leaf.stats['攻撃分類']}`;
      const sigs = new Set(meaningful.map(sig));
      if (sigs.size === 1) return meaningful[0];
    }
  }

  return null;
}

export function mergeBareIntoBc(bareNode, bcNode) {
  const bareLeaves = collectStatsLeaves(bareNode).filter((l) => hasMeaningfulAttackInfo(l.stats));
  if (!bareLeaves.length) return;

  for (const bcLeaf of collectStatsLeaves(bcNode)) {
    if (!needsAttackInfo(bcLeaf.stats)) continue;
    const source = findMatchingBareLeaf(bareLeaves, bcLeaf);
    if (source) applyAttackInfoIfMissing(bcLeaf.stats, source.stats);
  }
}

export function mergeLvCommandBucket(cmdTree) {
  if (!cmdTree || typeof cmdTree !== 'object') return cmdTree;

  const keys = Object.keys(cmdTree).filter((k) => k !== '追加効果');
  for (const bareKey of keys.filter(isBareCommandKey)) {
    const bareNode = cmdTree[bareKey];
    for (const bcKey of keys.filter((k) => isBcVariantOfBare(bareKey, k))) {
      mergeBareIntoBc(bareNode, cmdTree[bcKey]);
    }
    delete cmdTree[bareKey];
  }

  return cmdTree;
}

export function mergeNestedMoveBareCommands(row) {
  if (!isNestedMoveRow(row) || !row['Lv']) return row;
  for (const cmdTree of Object.values(row['Lv'])) {
    mergeLvCommandBucket(cmdTree);
  }
  return row;
}

export function mergeCharacterBareCommandAttack(char) {
  const section = getCharacterCategories(char)[TARGET_CATEGORY];
  if (!section?.rows) return char;
  for (const row of section.rows) {
    mergeNestedMoveBareCommands(row);
  }
  return char;
}
