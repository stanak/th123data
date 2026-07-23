#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizeMoveName } from './normalize_move.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PATH = path.join(__dirname, 'lv_up_effects.json');

function loadLvUpEffects(filePath = DEFAULT_PATH) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const WIKI_MOVE_ALIASES = {
  '至る所に青山あり': '至る処に青山あり',
  '物質と反物質の宇宙': '物質と反物質の境界',
  'フィールドウルトラバイトレット': 'フィールドウルトラバイオレット',
  // Wiki 必殺技Lv-up表のタイポ → frame data 技名
  '人形火葬': '人形火操',
  '鳳紋蝶の槍': '鳳蝶紋の槍',
  '非想の威光': '緋想の威光',
};

/** Lv-up 適用後に frame data 側の誤表記を正しい技名へ */
const FRAME_MOVE_RENAMES = {
  '緋想の威光': '非想の威光',
};

function renameFrameMoveRows(char) {
  const section = char['必殺技'];
  if (!section?.rows) return char;
  for (const row of section.rows) {
    const renamed = FRAME_MOVE_RENAMES[row['技名']];
    if (renamed) row['技名'] = renamed;
  }
  return char;
}

export function normalizeWikiMoveName(name) {
  let s = String(name ?? '')
    .replace(/\u3000/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\n/g, '')
    .replace(/\(\*\d+\)/g, '')
    .replace(/-+$/g, '')
    .trim();
  s = WIKI_MOVE_ALIASES[s] ?? s;
  return normalizeMoveName(s);
}

function normalizeLookupKey(name) {
  return normalizeWikiMoveName(name).replace(/ /g, '');
}

function buildMoveEffectIndex(charEffects) {
  const index = new Map();
  for (const [moveName, levels] of Object.entries(charEffects?.moves ?? charEffects ?? {})) {
    index.set(normalizeLookupKey(moveName), { moveName, levels });
  }
  return index;
}

function findMoveRow(rows, moveName) {
  const key = normalizeLookupKey(moveName);
  return rows.find((row) => normalizeLookupKey(row['技名']) === key) ?? null;
}

export function patchCharacterLvUpEffects(char, characterName, lvUpData) {
  const charEffects = lvUpData?.characters?.[characterName] ?? lvUpData?.[characterName];
  if (!charEffects) return char;

  const section = char['必殺技'];
  if (!section?.rows) return char;

  const index = buildMoveEffectIndex(charEffects);
  for (const { moveName, levels } of index.values()) {
    const row = findMoveRow(section.rows, moveName);
    if (!row?.Lv || typeof row.Lv !== 'object') continue;
    for (const [lvKey, text] of Object.entries(levels)) {
      if (!row.Lv[lvKey] || typeof row.Lv[lvKey] !== 'object') continue;
      if (!text) continue;
      row.Lv[lvKey]['追加効果'] = text;
    }
  }
  return renameFrameMoveRows(char);
}

export function patchAllLvUpEffects(characters, lvUpData) {
  for (const [name, char] of Object.entries(characters)) {
    patchCharacterLvUpEffects(char, name, lvUpData);
  }
  return characters;
}

export function loadAndPatchCharacters(characters, filePath = DEFAULT_PATH) {
  const lvUpData = loadLvUpEffects(filePath);
  if (!lvUpData) return characters;
  return patchAllLvUpEffects(characters, lvUpData);
}
