#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  patchYoumuZujouAdvantage,
  ZUJOU_214B_ADVANTAGE_TABLE,
  ZUJOU_214C_ADVANTAGE_TABLE,
  ZUJOU_214HB_ADVANTAGE_TABLE,
} from './patch_youmu_zujou_advantage.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'frame_data.json'), 'utf8'));

const row = data.characters['妖夢']['必殺技'].rows.find((r) => r['技名'] === '頭上花剪斬');
assert.ok(row?.Lv);

let foundB = 0;
let foundC = 0;
let foundHB = 0;
for (const cmdTree of Object.values(row.Lv)) {
  const leafB = cmdTree['214B']?.['_'];
  if (leafB?.['動作']?.['発生'] === '33') {
    assert.deepEqual(leafB['特記事項'], ZUJOU_214B_ADVANTAGE_TABLE);
    foundB++;
  }
  const leafC = cmdTree['214C']?.['_'];
  if (leafC?.['動作']?.['発生'] === '39') {
    assert.deepEqual(leafC['特記事項'], ZUJOU_214C_ADVANTAGE_TABLE);
    foundC++;
  }
  const leafHB = cmdTree['214HB']?.['_'];
  if (leafHB?.['動作']?.['発生'] === '48') {
    assert.deepEqual(leafHB['特記事項'], ZUJOU_214HB_ADVANTAGE_TABLE);
    foundHB++;
  }
}
assert.ok(foundB >= 1, '214B 33F leaf should have 特記事項');
assert.ok(foundC >= 1, '214C 39F leaf should have 特記事項');
assert.ok(foundHB >= 1, '214HB 48F leaf should have 特記事項');

const untouched = patchYoumuZujouAdvantage({ 必殺技: { rows: [] } }, '霊夢');
assert.equal(untouched['必殺技'].rows.length, 0);

console.log(JSON.stringify({ ok: true, patched214B: foundB, patched214C: foundC, patched214HB: foundHB }, null, 2));
