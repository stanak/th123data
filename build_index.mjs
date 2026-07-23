#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CHARACTER_ORDER } from './characters.mjs';
import { getCharacterCategories } from './character_frame.mjs';
import { collapseLvEntries, isNestedMoveRow } from './lv_utils.mjs';
import {
  classifyVariantLabel,
  isVariantBucketNode,
  positionSortKey,
  segmentSortKey,
  VARIANT_BUCKETS,
} from './variant_buckets.mjs';
import { parseFrameValue } from './frame_parse.mjs';

export { parseFrameValue } from './frame_parse.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRAME_DATA = path.join(__dirname, 'frame_data.json');
const OUT = path.join(__dirname, 'search', 'public', 'search_index.json');

const CATEGORIES = ['通常技', '射撃技', '必殺技', 'スペルカード'];

/** @returns {{ min: number|null, max: number|null, raw: string|null, values: number[] }} */
export function parseAdvantageField(raw) {
  if (raw == null || raw === '' || raw === '-' || raw === '〃') {
    return { min: null, max: null, raw: null, values: [] };
  }
  const s = String(raw).trim();
  if (!s || s === 'down' || s.includes('大幅')) {
    return { min: null, max: null, raw: s, values: [] };
  }
  const range = s.match(/^([+-]?[\d.]+)(?:\[([+-]?[\d.]+)\])?$/);
  if (range) {
    const a = Number(range[1]);
    const b = range[2] != null ? Number(range[2]) : a;
    const min = Math.min(a, b);
    const max = Math.max(a, b);
    return { min, max, raw: s, values: min === max ? [min] : [min, max] };
  }
  const pm = s.match(/^±(\d+)$/);
  if (pm) return { min: 0, max: 0, raw: s, values: [0] };
  const num = parseFrameValue(s);
  if (num != null) return { min: num, max: num, raw: s, values: [num] };
  return { min: null, max: null, raw: s, values: [] };
}

/** @param {Record<string, string>|undefined} adv */
function parseAdvantage(adv) {
  const keys = ['正G', '誤G', '通常', 'CH'];
  const out = { seig: null, goG: null, tsujo: null, ch: null, min: null, max: null, raws: {} };
  if (!adv || typeof adv !== 'object') return out;
  const map = { 正G: 'seig', 誤G: 'goG', 通常: 'tsujo', CH: 'ch' };
  const allValues = [];
  for (const k of keys) {
    const parsed = parseAdvantageField(adv[k]);
    out.raws[k] = parsed.raw;
    if (parsed.min != null) {
      out[map[k]] = parsed.min;
      allValues.push(parsed.min, parsed.max);
    }
  }
  const nums = allValues.filter((v) => v != null);
  if (nums.length) {
    out.min = Math.min(...nums);
    out.max = Math.max(...nums);
  }
  return out;
}

function buildParsed(stats) {
  const dousa = stats['動作'] || {};
  const cancel = stats['キャンセル'] || {};
  return {
    startup: parseFrameValue(dousa['発生']),
    total: parseFrameValue(dousa['全体']),
    active: parseFrameValue(dousa['持続']),
    blackout: parseFrameValue(dousa['暗転']),
    cancelUpper: parseFrameValue(cancel['上位']),
    cancelMove: parseFrameValue(cancel['移動']),
    advantage: parseAdvantage(stats['有利差']),
  };
}

function hasDisplayableValue(value) {
  if (value == null || value === '' || value === '-') return false;
  if (typeof value === 'object' && !Array.isArray(value)) {
    return Object.values(value).some((v) => hasDisplayableValue(v));
  }
  return true;
}

const PARENT_SUMMARY_KEYS = ['動作', 'キャンセル', '有利差', '備考'];
const BULLET_STAT_KEYS = ['ヒット数', '相殺強度', '相殺回数', 'グレイズ耐久数', '射撃備考'];

export function mergeBulletStatsFromParent(parentRow, stats) {
  const merged = { ...stats };
  for (const key of BULLET_STAT_KEYS) {
    const parentValue = parentRow?.[key];
    if (parentValue == null || parentValue === '' || parentValue === '-') continue;
    const childValue = merged[key];
    if (childValue == null || childValue === '' || childValue === '-') {
      merged[key] = parentValue;
    }
  }
  return merged;
}

export function extractParentStats(row) {
  const { 技名, 状態, 攻撃Lv, 攻撃分類, コマンド, Lv, ヒットストップ, 受身不能, ...rest } = row;
  const summaryStats = {};
  for (const key of PARENT_SUMMARY_KEYS) {
    const value = row[key] ?? rest[key];
    if (value != null && hasDisplayableValue(value)) {
      summaryStats[key] = value;
    }
  }
  if (!Object.keys(summaryStats).length) return null;
  return summaryStats;
}

function pushIndexRow(rows, ctx, parentRow, stats, moveName, variant, parentStats = null) {
  const entry = {
    id: String(ctx.id++),
    character: ctx.character,
    category: ctx.category,
    moveName,
    segment: variant.segment,
    position: variant.position,
    stateName: variant.stateName,
    command: parentRow['コマンド'] ?? stats['コマンド'] ?? null,
    lv: parentRow['Lv'] ?? stats['Lv'] ?? null,
    stats,
    parsed: buildParsed(stats),
  };
  if (parentStats) {
    entry.parentStats = parentStats;
    entry.parentParsed = buildParsed(parentStats);
  }
  rows.push(entry);
}

function leafVariant(bucket, key) {
  return {
    segment: bucket === '段' ? key : null,
    position: bucket === '位置' ? key : null,
    stateName: bucket === '状態' ? key : null,
  };
}

function collectLeavesFromCmdNode(cmdNode, lv, lvKey, command) {
  const leaves = [];
  const lvNum = Number(lvKey);
  const resolvedLv = Number.isNaN(lvNum) ? lvKey : lvNum;

  if (isVariantBucketNode(cmdNode)) {
    if (cmdNode['_'] && typeof cmdNode['_'] === 'object') {
      leaves.push({
        lv: resolvedLv,
        lvKey,
        command: command || null,
        segment: null,
        position: null,
        stateName: null,
        stats: cmdNode['_'],
      });
    }
    for (const bucket of VARIANT_BUCKETS) {
      const bucketNode = cmdNode[bucket];
      if (!bucketNode || typeof bucketNode !== 'object') continue;
      for (const [key, stats] of Object.entries(bucketNode)) {
        const variant = leafVariant(bucket, key);
        leaves.push({
          lv: resolvedLv,
          lvKey,
          command: command || null,
          ...variant,
          stats,
        });
      }
    }
    return leaves;
  }

  for (const [key, stats] of Object.entries(cmdNode)) {
    if (key === '_' || typeof stats !== 'object' || stats == null) continue;
    const classified = classifyVariantLabel(key);
    const variant = classified
      ? leafVariant(classified.bucket, classified.key)
      : { segment: null, position: null, stateName: key };
    leaves.push({
      lv: resolvedLv,
      lvKey,
      command: command || null,
      ...variant,
      stats,
    });
  }
  return leaves;
}

function collectNestedLeaves(lvTree) {
  const leaves = [];
  for (const [lvKey, cmdTree] of Object.entries(lvTree)) {
    if (!cmdTree || typeof cmdTree !== 'object') continue;
    const lvEffect = typeof cmdTree['追加効果'] === 'string' ? cmdTree['追加効果'] : null;
    for (const [cmdKey, cmdNode] of Object.entries(cmdTree)) {
      if (cmdKey === '追加効果') continue;
      for (const leaf of collectLeavesFromCmdNode(cmdNode, lvKey, lvKey, cmdKey)) {
        if (lvEffect) {
          leaf.stats = { ...leaf.stats, 追加効果: lvEffect };
        }
        leaves.push(leaf);
      }
    }
  }
  return leaves;
}

function indexStateRows(rows, ctx, row) {
  const states = row['状態'];
  if (!Array.isArray(states) || !states.length) return;
  const moveName = String(row['技名'] ?? '');
  const parentStats = extractParentStats(row);
  for (const state of states) {
    const classified = classifyVariantLabel(state['技名']);
    const variant = classified
      ? {
          segment: classified.bucket === '段' ? classified.key : null,
          position: classified.bucket === '位置' ? classified.key : null,
          stateName: classified.bucket === '状態' ? classified.key : null,
        }
      : { segment: null, position: null, stateName: String(state['技名'] ?? '') || null };
    pushIndexRow(rows, ctx, row, mergeBulletStatsFromParent(row, state), moveName, variant, parentStats);
  }
}

function indexNestedMoveRow(rows, ctx, row) {
  const moveName = String(row['技名'] ?? '');
  const parentStats = extractParentStats(row);
  const leaves = collectNestedLeaves(row['Lv']);

  const groups = new Map();
  for (const leaf of leaves) {
    const key = `${leaf.segment ?? ''}\0${leaf.position ?? ''}\0${leaf.stateName ?? ''}\0${leaf.command ?? ''}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(leaf);
  }

  const sortedKeys = [...groups.keys()].sort((a, b) => {
    const [segA, posA, stateA, cmdA] = a.split('\0');
    const [segB, posB, stateB, cmdB] = b.split('\0');
    const segKeyA = segmentSortKey(segA || null);
    const segKeyB = segmentSortKey(segB || null);
    if (typeof segKeyA === 'number' && typeof segKeyB === 'number' && segKeyA !== segKeyB) {
      return segKeyA - segKeyB;
    }
    const segCmp = String(segA).localeCompare(String(segB), 'ja', { numeric: true });
    if (segCmp) return segCmp;
    const posCmp = positionSortKey(posA || null) - positionSortKey(posB || null);
    if (posCmp) return posCmp;
    const stateCmp = String(stateA).localeCompare(String(stateB), 'ja', { numeric: true });
    if (stateCmp) return stateCmp;
    return String(cmdA).localeCompare(String(cmdB), 'ja');
  });

  for (const key of sortedKeys) {
    const groupLeaves = groups.get(key);
    const collapsed = collapseLvEntries(
      groupLeaves.map((leaf) => ({
        lv: typeof leaf.lv === 'number' && !Number.isNaN(leaf.lv) ? leaf.lv : Number(leaf.lvKey),
        stats: leaf.stats,
        command: leaf.command,
        segment: leaf.segment,
        position: leaf.position,
        stateName: leaf.stateName,
      })),
    );
    for (const item of collapsed) {
      pushIndexRow(
        rows,
        ctx,
        { コマンド: item.command, Lv: item.lvDisplay },
        item.stats,
        moveName,
        {
          segment: item.segment ?? null,
          position: item.position ?? null,
          stateName: item.stateName ?? null,
        },
        parentStats,
      );
    }
  }
}

function buildIndex() {
  const data = JSON.parse(fs.readFileSync(FRAME_DATA, 'utf8'));
  const characters = CHARACTER_ORDER.filter((name) => data.characters[name]);
  const footnotes = {};
  const rows = [];
  const ctx = { id: 0, character: '', category: '' };

  for (const character of characters) {
    ctx.character = character;
    const charData = data.characters[character];
    if (charData.footnotes) footnotes[character] = charData.footnotes;
    const sections = getCharacterCategories(charData);
    for (const category of CATEGORIES) {
      ctx.category = category;
      const section = sections[category];
      if (!section?.rows) continue;
      for (const row of section.rows) {
        if (isNestedMoveRow(row)) {
          if (Array.isArray(row['状態']) && row['状態'].length) {
            indexStateRows(rows, ctx, row);
          } else {
            indexNestedMoveRow(rows, ctx, row);
          }
          continue;
        }
        if (Array.isArray(row['状態']) && row['状態'].length) {
          indexStateRows(rows, ctx, row);
          continue;
        }
        const moveName = row['技名'] ?? row['行動の種類'] ?? '';
        pushIndexRow(rows, ctx, row, row, String(moveName), {
          segment: null,
          position: null,
          stateName: null,
        });
      }
    }
  }

  const index = {
    generatedAt: new Date().toISOString(),
    characterCount: characters.length,
    rowCount: rows.length,
    characters,
    categories: CATEGORIES,
    footnotes,
    rows,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(index), 'utf8');
  console.log(JSON.stringify({ out: OUT, characters: characters.length, rows: rows.length }, null, 2));
}

buildIndex();
