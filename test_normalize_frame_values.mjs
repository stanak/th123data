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
assert.equal(normalizeFrameListValue('152025…'), '15,20,25,...');
assert.equal(normalizeFrameListValue('3942…57'), '39,42,...,57');
assert.equal(normalizeFrameListValue('2025…65'), '20,25,...,65');
assert.equal(normalizeFrameListValue('42、4548、51…66、69'), '42,45,48,51,...,66,69');
assert.equal(normalizeFrameListValue('88101'), '88,101');
assert.equal(normalizeFrameListValue('101121'), '101,121');
assert.equal(normalizeFrameListValue('9499104109'), '94,99,104,109');
assert.equal(normalizeFrameListValue('114150186222'), '114,150,186,222');
assert.equal(normalizeFrameListValue('117119…147'), '117,119,...,147');

const reimu = flattenCharacter(
  JSON.parse(fs.readFileSync(path.join(__dirname, 'chars/霊夢.json'), 'utf8')),
);
const spell = reimu['スペルカード'].rows.find((r) => r['技名'] === '明珠暗投');
assert.equal(spell['状態'][0]['動作']['発生'], '27,33,39');

const bullet = reimu['射撃技'].rows.find((r) => r['技名'] === '2C');
assert.equal(bullet['動作']['発生'], '15,20,25,...');

const sakuya = flattenCharacter(
  JSON.parse(fs.readFileSync(path.join(__dirname, 'chars/咲夜.json'), 'utf8')),
);
const hb = sakuya['射撃技'].rows.find((r) => r['技名'] === 'HB');
assert.equal(hb['動作']['発生'], '39,42,...,57');

console.log(JSON.stringify({ ok: true }, null, 2));
