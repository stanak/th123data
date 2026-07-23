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

assert.equal(normalizeWikiMoveName('人形火葬'), '人形火操');
assert.equal(normalizeWikiMoveName('鳳紋蝶の槍'), '鳳蝶紋の槍');
assert.equal(normalizeWikiMoveName('非想の威光'), '非想の威光');
assert.equal(normalizeWikiMoveName('六震-相'), '六震-相-');

const aliceFire = data.characters['アリス']['必殺技'].rows.find((r) => r['技名'] === '人形火操');
assert.equal(aliceFire.Lv['2']['追加効果'], lvUp.characters['アリス'].moves['人形火葬']['2']);
assert.equal(aliceFire.Lv['4']['追加効果'], lvUp.characters['アリス'].moves['人形火葬']['4']);

const yuyukoSpear = data.characters['幽々子']['必殺技'].rows.find((r) => r['技名'] === '鳳蝶紋の槍');
assert.equal(yuyukoSpear.Lv['3']['追加効果'], lvUp.characters['幽々子'].moves['鳳紋蝶の槍']['3']);

const tenshiGlory = data.characters['天子']['必殺技'].rows.find((r) => r['技名'] === '非想の威光');
assert.ok(tenshiGlory, 'renamed to 非想の威光');
assert.equal(tenshiGlory.Lv['1']['追加効果'], lvUp.characters['天子'].moves['非想の威光']['1']);
assert.equal(tenshiGlory.Lv['4']['追加効果'], lvUp.characters['天子'].moves['非想の威光']['4']);
assert.ok(!data.characters['天子']['必殺技'].rows.some((r) => r['技名'] === '緋想の威光'));

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

const index = JSON.parse(fs.readFileSync(path.join(__dirname, 'search/public/search_index.json'), 'utf8'));
let indexLvUp = 0;
for (const r of index.rows) if (r.stats['追加効果']) indexLvUp++;
assert.ok(indexLvUp >= 500, `expected 追加効果 in search index, got ${indexLvUp}`);
const sanaeWindIdx = index.rows.find((r) => r.character === '早苗' && r.moveName === '風起こし' && r.lv === '1');
assert.equal(sanaeWindIdx?.stats?.['追加効果'], sanaeEffects['風起こし']['1']);

console.log(JSON.stringify({ ok: true, patched, missingMove, missingLv, indexLvUp }, null, 2));
