#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { patchYoumuZujouAdvantage, ZUJOU_214B_ADVANTAGE_TABLE } from './patch_youmu_zujou_advantage.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'frame_data.json'), 'utf8'));

const row = data.characters['妖夢']['必殺技'].rows.find((r) => r['技名'] === '頭上花剪斬');
assert.ok(row?.Lv);

let found = 0;
for (const cmdTree of Object.values(row.Lv)) {
  const leaf = cmdTree['214B']?.['_'];
  if (leaf?.['動作']?.['発生'] === '33') {
    assert.deepEqual(leaf['特記事項'], ZUJOU_214B_ADVANTAGE_TABLE);
    found++;
  }
}
assert.ok(found >= 1, '214B 33F leaf should have 特記事項');

const untouched = patchYoumuZujouAdvantage({ 必殺技: { rows: [] } }, '霊夢');
assert.equal(untouched['必殺技'].rows.length, 0);

console.log(JSON.stringify({ ok: true, patchedLeaves: found }, null, 2));
