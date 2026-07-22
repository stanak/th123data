#!/usr/bin/env node
import assert from 'node:assert/strict';
import { normalizeFrameListValue } from './normalize_frame_values.mjs';
import { flattenCharacter } from './flatten_frame_data.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

assert.equal(normalizeFrameListValue('15、1821、2427'), '15,18,21,24,27');
assert.equal(normalizeFrameListValue('273339'), '27,33,39');
assert.equal(normalizeFrameListValue('12151821'), '12,15,18,21');
assert.equal(normalizeFrameListValue('13'), '13');
assert.equal(normalizeFrameListValue('404754'), '40,47,54');
assert.equal(normalizeFrameListValue('備考'), '備考');

const reimu = flattenCharacter(
  JSON.parse(fs.readFileSync(path.join(__dirname, 'chars/霊夢.json'), 'utf8')),
);
const spell = reimu.frameData['フレームデータ']['スペルカード'].rows[0];
assert.equal(spell['動作']['発生'], '27,33,39');

const bullet = reimu.frameData['フレームデータ']['射撃技'].rows.find((r) => r['技名'] === 'JB');
assert.equal(bullet['動作']['発生'], '15,18,21,24,27');

console.log(JSON.stringify({ ok: true }, null, 2));
