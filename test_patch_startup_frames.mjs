#!/usr/bin/env node
import assert from 'node:assert/strict';
import { patchStartupValue, patchCharacterStartupFrames } from './patch_startup_frames.mjs';
import { flattenCharacter } from './flatten_frame_data.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

assert.equal(patchStartupValue('10,11,21'), '101,121');
assert.equal(patchStartupValue('61,68,77,88,10,1'), '61,68,77,88,101');

const sakuya = flattenCharacter(
  JSON.parse(fs.readFileSync(path.join(__dirname, 'chars/咲夜.json'), 'utf8')),
);
const spell = sakuya['スペルカード'].rows.find((r) => r['技名'] === '殺人ドール');
const startup = spell?.['動作']?.['発生'] ?? spell?.['Lv']?.['']?.['']?.['_']?.['動作']?.['発生'];
assert.equal(startup, '117,119,...,147');

const misdir = sakuya['必殺技'].rows.find((r) => r['技名'] === 'ミスディレクション');
function collectStartups(node, out = []) {
  if (node?.['動作']?.['発生']) out.push(node['動作']['発生']);
  if (node && typeof node === 'object') {
    for (const v of Object.values(node)) collectStartups(v, out);
  }
  return out;
}
assert.ok(collectStartups(misdir).includes('101,121'));

console.log('test_patch_startup_frames: ok');
