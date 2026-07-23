#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { patchCharacterBulletQuickRef } from './patch_bullet_quick_ref.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const quickRef = JSON.parse(fs.readFileSync(path.join(__dirname, 'bullet_quick_ref.json'), 'utf8'));
const frame = JSON.parse(fs.readFileSync(path.join(__dirname, 'frame_data.json'), 'utf8'));

const sanae = structuredClone(frame.characters['早苗']);
const { patched, unmatched } = patchCharacterBulletQuickRef(sanae, '早苗', quickRef);
assert.ok(patched > 0, 'should patch 早苗 rows');

const b = sanae['射撃技'].rows.find((r) => r['技名'] === 'B');
assert.equal(b['相殺強度'], 'C');
assert.equal(b['相殺回数'], '1回');
assert.equal(b['グレイズ耐久数'], '1回');
assert.ok(b['射撃備考']?.includes('8弾'));

const cFront = sanae['射撃技'].rows.find((r) => r['技名'] === 'C')['状態']
  .find((s) => s['技名'] === '前半分');
assert.equal(cFront['相殺強度'], 'B');
assert.equal(cFront['グレイズ耐久数'], '1回');

console.log(JSON.stringify({ ok: true, patched, unmatchedCount: unmatched.length }, null, 2));
