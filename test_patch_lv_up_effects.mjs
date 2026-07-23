#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizeWikiMoveName } from './patch_lv_up_effects.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lvUp = JSON.parse(fs.readFileSync(path.join(__dirname, 'lv_up_effects.json'), 'utf8'));
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'frame_data.json'), 'utf8'));

const sanaeEffects = lvUp.characters['早苗'].moves;
const row = data.characters['早苗']['必殺技'].rows.find((r) => r['技名'] === '風起こし');
assert.ok(row?.Lv?.['1']);
assert.equal(row.Lv['1']['追加効果'], sanaeEffects['風起こし']['1']);
assert.equal(row.Lv['4']['追加効果'], sanaeEffects['風起こし']['4']);

const wave = data.characters['早苗']['必殺技'].rows.find((r) => r['技名'] === '波起こし');
assert.equal(wave.Lv['1']?.['追加効果'], undefined);
assert.equal(wave.Lv['2']['追加効果'], sanaeEffects['波起こし']['2']);

function lookupKey(name) {
  return normalizeWikiMoveName(name).replace(/ /g, '');
}

let patched = 0;
let missingMove = 0;
let missingLv = 0;
for (const [charName, charData] of Object.entries(lvUp.characters)) {
  const rows = data.characters[charName]['必殺技']?.rows ?? [];
  for (const [moveName, levels] of Object.entries(charData.moves)) {
    const moveRow = rows.find((r) => lookupKey(r['技名']) === lookupKey(moveName));
    if (!moveRow) {
      missingMove++;
      continue;
    }
    for (const [lvKey, text] of Object.entries(levels)) {
      if (moveRow.Lv?.[lvKey]?.['追加効果'] === text) patched++;
      else missingLv++;
    }
  }
}

assert.ok(patched >= 500, `expected many patched entries, got ${patched}`);
assert.ok(missingMove <= 10, `too many unmatched moves: ${missingMove}`);
assert.ok(missingLv <= 5, `too many unmatched lv slots: ${missingLv}`);

console.log(JSON.stringify({ ok: true, patched, missingMove, missingLv }, null, 2));
