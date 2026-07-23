#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'frame_data.json'), 'utf8'));

const spells = data.characters['妖夢']['スペルカード'].rows;
const kurin = spells.find((r) => r['技名'] === '幽明の苦輪');
const hou = spells.find((r) => r['技名'] === '幽明求問持聡明の法');
const badRows = spells.filter((r) => typeof r['技名'] !== 'string');

assert.equal(badRows.length, 0);
assert.equal(kurin['状態'].length, 16);
assert.equal(hou['状態'].length, 16);
assert.equal(kurin['状態'][0]['技名'], '近A');
assert.equal(kurin['状態'][6]['技名'], '2A');
assert.equal(kurin['状態'][7]['技名'], '2A');
assert.equal(kurin['状態'][8]['技名'], '6A');
assert.equal(hou['状態'][0]['技名'], '近A');
assert.equal(hou['状態'][15]['技名'], 'DC');

console.log(JSON.stringify({ ok: true, kurinStates: kurin['状態'].length, houStates: hou['状態'].length }, null, 2));
