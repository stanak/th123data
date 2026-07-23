#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  expandWikiBulletTargets,
  normalizeGroupLabel,
  normalizeLookupKey,
  subNameMatches,
} from './wiki_bullet_name.mjs';
import { normalizeMoveName } from './normalize_move.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PATH = path.join(__dirname, 'bullet_quick_ref.json');

const PATCH_CATEGORIES = ['通常技', '射撃技', '必殺技', 'スペルカード'];

function applyBulletQuickFields(target, source) {
  if (source.相殺強度) target['相殺強度'] = source.相殺強度;
  if (source.相殺回数) target['相殺回数'] = source.相殺回数;
  if (source.グレイズ耐久数) target['グレイズ耐久数'] = source.グレイズ耐久数;
  if (source.備考) target['射撃備考'] = source.備考;
  if (source.ヒット数 && source.ヒット数 !== '-') target['ヒット数'] = source.ヒット数;
}

function rowNameKeys(name) {
  const keys = new Set();
  if (!name) return keys;
  keys.add(normalizeLookupKey(name));
  keys.add(normalizeLookupKey(normalizeMoveName(name)));
  return keys;
}

function groupMoveLookupKeys(groupName) {
  const keys = new Set();
  const norm = normalizeGroupLabel(groupName);
  if (!norm) return keys;
  keys.add(normalizeLookupKey(norm));
  keys.add(normalizeLookupKey(norm.replace(/\s+/g, '')));
  return keys;
}

function rowMatchesGroup(row, groupName) {
  const rowKey = normalizeLookupKey(row?.['技名']);
  return groupMoveLookupKeys(groupName).has(rowKey);
}

function isGroupScopedEntry(groupName, char) {
  for (const category of PATCH_CATEGORIES) {
    const rows = char[category]?.rows;
    if (!rows) continue;
    if (rows.some((row) => rowMatchesGroup(row, groupName))) return true;
  }
  return false;
}

function findStateChild(row, wikiSub) {
  if (!Array.isArray(row?.['状態'])) return null;
  return row['状態'].find((st) => subNameMatches(wikiSub, st['技名'])) ?? null;
}

function patchRowDirect(row, wikiEntry, wikiSub) {
  if (!row) return false;
  if (wikiSub && Array.isArray(row['状態'])) {
    const child = findStateChild(row, wikiSub);
    if (child) {
      applyBulletQuickFields(child, wikiEntry);
      return true;
    }
  }
  if (wikiSub && !subNameMatches(wikiSub, row['技名'])) return false;
  applyBulletQuickFields(row, wikiEntry);
  return true;
}

function walkNestedStates(node, wikiGroup, wikiSub, wikiEntry, patched) {
  if (!node || typeof node !== 'object') return;
  if (node['状態'] && typeof node['状態'] === 'object' && !Array.isArray(node['状態'])) {
    for (const [stateName, stateRow] of Object.entries(node['状態'])) {
      if (!stateRow || typeof stateRow !== 'object') continue;
      if (subNameMatches(wikiSub, stateName) || normalizeLookupKey(stateName) === normalizeLookupKey(wikiGroup)) {
        applyBulletQuickFields(stateRow, wikiEntry);
        patched.add(`${wikiGroup}/${stateName}`);
      }
    }
  }
  if (node['Lv'] && typeof node['Lv'] === 'object') {
    for (const lvObj of Object.values(node['Lv'])) walkNestedStates(lvObj, wikiGroup, wikiSub, wikiEntry, patched);
  }
  for (const value of Object.values(node)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      walkNestedStates(value, wikiGroup, wikiSub, wikiEntry, patched);
    }
  }
}

export function patchCharacterBulletQuickRef(char, characterName, quickRefData) {
  const charData = quickRefData?.characters?.[characterName] ?? quickRefData?.[characterName];
  if (!charData?.rows?.length) return { patched: 0, unmatched: [] };

  let patched = 0;
  const unmatched = [];

  for (const wikiEntry of charData.rows) {
    if (normalizeGroupLabel(wikiEntry.group).startsWith('射撃技早見表')) continue;

    const targets = expandWikiBulletTargets(wikiEntry.group, wikiEntry.sub);
    const groupNorm = normalizeGroupLabel(wikiEntry.group);
    const subNorm = normalizeGroupLabel(wikiEntry.sub);
    const wikiSub = subNorm === groupNorm ? null : subNorm;
    const isPartRow = wikiSub === '前半部分' || wikiSub === '後半部分';
    const groupScoped = isGroupScopedEntry(wikiEntry.group, char);
    let hit = false;

    for (const category of PATCH_CATEGORIES) {
      const rows = char[category]?.rows;
      if (!rows) continue;

      if (!groupScoped) {
        for (const targetName of targets) {
          const keys = rowNameKeys(targetName);
          for (const row of rows) {
            const rowKey = normalizeLookupKey(row['技名']);
            if (!keys.has(rowKey)) continue;

            if (isPartRow && Array.isArray(row['状態'])) {
              const child = findStateChild(row, wikiSub);
              if (child) {
                applyBulletQuickFields(child, wikiEntry);
                patched++;
                hit = true;
              }
              continue;
            }

            if (patchRowDirect(row, wikiEntry, null)) {
              patched++;
              hit = true;
            }
          }
        }
      }

      for (const row of rows) {
        if (groupScoped && !rowMatchesGroup(row, wikiEntry.group)) continue;

        if (rowMatchesGroup(row, wikiEntry.group)) {
          if (patchRowDirect(row, wikiEntry, wikiSub)) {
            patched++;
            hit = true;
          }
        }

        if (!groupScoped || rowMatchesGroup(row, wikiEntry.group)) {
          const nested = new Set();
          walkNestedStates(row, wikiEntry.group, wikiSub, wikiEntry, nested);
          if (nested.size) {
            patched += nested.size;
            hit = true;
          }
        }
      }
    }

    if (!hit) unmatched.push({ group: wikiEntry.group, sub: wikiEntry.sub });
  }

  return { patched, unmatched };
}

export function loadBulletQuickRef(filePath = DEFAULT_PATH) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}
