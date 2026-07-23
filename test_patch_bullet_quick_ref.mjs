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

const suika = structuredClone(frame.characters['萃香']);
patchCharacterBulletQuickRef(suika, '萃香', quickRef);
const suikaJa = suika['通常技'].rows.find((r) => r['技名'] === 'JA');
assert.equal(suikaJa['ヒット数'], undefined);
const missing = suika['スペルカード'].rows.find((r) => r['技名'] === 'ミッシングパープルパワー');
const missingA = missing['状態'].find((s) => s['技名'] === 'A');
assert.equal(missingA['ヒット数'], '1');
assert.ok(missingA['射撃備考']?.includes('特別射撃属性'));
const missingJa = missing['状態'].find((s) => s['技名'] === 'JA');
assert.equal(missingJa['ヒット数'], '1');

const alice = structuredClone(frame.characters['アリス']);
patchCharacterBulletQuickRef(alice, 'アリス', quickRef);
const alice6A = alice['通常技'].rows.find((r) => r['技名'] === '6A');
const alice2A = alice['通常技'].rows.find((r) => r['技名'] === '2A');
assert.equal(alice6A['射撃備考'], undefined);
assert.equal(alice2A['射撃備考'], undefined);
const mirai = alice['スペルカード'].rows.find((r) => r['技名'] === '未来文楽');
const miraiA = mirai['状態'].find((s) => s['技名'] === 'A');
assert.equal(miraiA['ヒット数'], '5');
const mirai6A = mirai['状態'].find((s) => s['技名'] === '6A');
assert.equal(mirai6A['ヒット数'], '4');

const marisa = structuredClone(frame.characters['魔理沙']);
patchCharacterBulletQuickRef(marisa, '魔理沙', quickRef);
const marisaDb = marisa['通常技'].rows.find((r) => r['技名'] === 'DB');
assert.equal(marisaDb['ヒット数'], '1');
const marisaHj2a = marisa['通常技'].rows.find((r) => r['技名'] === 'HJ2A');
assert.equal(marisaHj2a['相殺強度'], 'B');

console.log(JSON.stringify({ ok: true, patched, unmatchedCount: unmatched.length }, null, 2));
