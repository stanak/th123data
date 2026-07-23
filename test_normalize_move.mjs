#!/usr/bin/env node
import assert from 'node:assert/strict';
import { normalizeMoveName } from './normalize_move.mjs';
import { flattenCharacter } from './flatten_frame_data.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const cases = [
  ['立B', 'B'],
  ['立C', 'C'],
  ['H立B', 'HB'],
  ['H立C', 'HC'],
  ['B系-立B', 'B'],
  ['B系-6B', '6B'],
  ['C系-立C-弾頭', 'C-弾頭'],
  ['ホールドB系-H立B', 'HB'],
  ['6C系-6C', '6C'],
  ['天狗の立風露', '天狗の立風露'],
  ['立ちBC共通大蝦蟇神-内側', '立ちBC共通大蝦蟇神-内側'],
];

for (const [input, expected] of cases) {
  assert.equal(normalizeMoveName(input), expected, input);
}

const frame = JSON.parse(fs.readFileSync(path.join(__dirname, 'frame_data.json'), 'utf8'));
const reimuBullets = frame.characters['霊夢']['射撃技'].rows;
const names = new Set(reimuBullets.map((r) => r['技名']));

assert.ok(names.has('B'), 'expected normalized B');
assert.ok(!names.has('B系-立B'), 'B系-立B should be removed');
assert.ok(!names.has('立B'), '立B should be removed');
assert.ok(!/[BC]系-/.test([...names].join('\n')), 'no series prefixes remain');

console.log(JSON.stringify({ ok: true, samples: [...names].slice(0, 8) }, null, 2));
