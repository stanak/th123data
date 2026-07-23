#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const index = JSON.parse(fs.readFileSync(path.join(__dirname, 'search/public/search_index.json'), 'utf8'));

function spellStateRows(moveName) {
  return index.rows.filter(
    (r) =>
      r.character === '妖夢' &&
      r.category === 'スペルカード' &&
      r.moveName === moveName &&
      r.stateName,
  );
}

for (const moveName of ['幽明の苦輪', '幽明求問持聡明の法']) {
  const rows = spellStateRows(moveName);
  assert.equal(rows.length, 16, `${moveName} should have 16 state rows`);
  assert.ok(rows.every((r) => r.parentStats), `${moveName} states should carry parentStats`);
}

const kurinNearA = spellStateRows('幽明の苦輪').find((r) => r.stateName === '近A');
assert.ok(kurinNearA);
assert.equal(kurinNearA.stats['有利差']?.['正G'], '+9');

console.log(JSON.stringify({ ok: true, youmuSpellStateRows: spellStateRows('幽明の苦輪').length }, null, 2));
