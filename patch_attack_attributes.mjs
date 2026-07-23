#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizeAttackAttrLookupKey, wikiAttackAttrNameVariants } from './wiki_attack_attr_name.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PATH = path.join(__dirname, 'attack_attributes.json');

const PATCH_CATEGORIES = {
  specials: '必殺技',
  spells: 'スペルカード',
};

function loadAttackAttributes(filePath = DEFAULT_PATH) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function findMoveRow(rows, moveName) {
  const keys = new Set(wikiAttackAttrNameVariants(moveName).map((v) => v.replace(/ /g, '')));
  return rows.find((row) => keys.has(normalizeAttackAttrLookupKey(row['技名']))) ?? null;
}

function applyAttackAttribute(row, source) {
  if (!row || !source?.attackAttribute) return false;
  if (row['攻撃属性'] != null && row['攻撃属性'] !== '') return false;
  row['攻撃属性'] = source.attackAttribute;
  return true;
}

function walkNestedStates(node, moveKey, source, patched) {
  if (!node || typeof node !== 'object') return;
  if (node['状態'] && typeof node['状態'] === 'object' && !Array.isArray(node['状態'])) {
    for (const stateRow of Object.values(node['状態'])) {
      if (stateRow && typeof stateRow === 'object' && applyAttackAttribute(stateRow, source)) {
        patched.add(`${moveKey}#state`);
      }
    }
  }
  if (node['Lv'] && typeof node['Lv'] === 'object') {
    for (const lvObj of Object.values(node['Lv'])) walkNestedStates(lvObj, moveKey, source, patched);
  }
  for (const value of Object.values(node)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      walkNestedStates(value, moveKey, source, patched);
    }
  }
}

export function patchCharacterAttackAttributes(char, characterName, attrData) {
  const charData = attrData?.characters?.[characterName] ?? attrData?.[characterName];
  if (!charData) return { patched: 0, unmatched: [] };

  let patched = 0;
  const unmatched = [];

  for (const [sourceKey, category] of Object.entries(PATCH_CATEGORIES)) {
    const entries = charData[sourceKey];
    if (!Array.isArray(entries)) continue;
    const rows = char[category]?.rows;
    if (!rows) continue;

    for (const entry of entries) {
      const row = findMoveRow(rows, entry.moveName);
      if (!row) {
        unmatched.push({ category, moveName: entry.moveName, attackAttribute: entry.attackAttribute });
        continue;
      }
      if (applyAttackAttribute(row, entry)) {
        patched++;
        continue;
      }
      const nested = new Set();
      walkNestedStates(row, entry.moveName, entry, nested);
      if (nested.size) patched += nested.size;
    }
  }

  return { patched, unmatched };
}

export function patchAllAttackAttributes(characters, attrData) {
  const summary = {};
  for (const [name, char] of Object.entries(characters)) {
    summary[name] = patchCharacterAttackAttributes(char, name, attrData);
  }
  return summary;
}

export function loadAndPatchCharacters(characters, filePath = DEFAULT_PATH) {
  const attrData = loadAttackAttributes(filePath);
  if (!attrData) return characters;
  patchAllAttackAttributes(characters, attrData);
  return characters;
}
