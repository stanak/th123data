#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { patchCharacterAttackAttributes } from './patch_attack_attributes.mjs';
import { flattenCharacter } from './flatten_frame_data.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const attr = JSON.parse(fs.readFileSync(path.join(__dirname, 'attack_attributes.json'), 'utf8'));
const frame = JSON.parse(fs.readFileSync(path.join(__dirname, 'frame_data.json'), 'utf8'));

const kuu = structuredClone(frame.characters['空']);
const { patched, unmatched } = patchCharacterAttackAttributes(kuu, '空', attr);
assert.ok(patched > 0);
assert.equal(unmatched.length, 0);
assert.equal(kuu['必殺技'].rows.find((r) => r['技名'] === 'グラウンドメルト')['攻撃属性'], '射撃');
assert.equal(kuu['スペルカード'].rows.find((r) => r['技名'] === '地獄の人口太陽')['攻撃属性'], '磨耗射撃');

const reisen = structuredClone(frame.characters['鈴仙']);
const r2 = patchCharacterAttackAttributes(reisen, '鈴仙', attr);
assert.equal(r2.unmatched.length, 0);
assert.equal(
  reisen['スペルカード'].rows.find((r) => r['技名'] === 'カローラヴィジョン')['攻撃属性'],
  '射撃',
);

const flat = flattenCharacter(JSON.parse(fs.readFileSync(path.join(__dirname, 'chars/霊夢.json'), 'utf8')));
patchCharacterAttackAttributes(flat, '霊夢', attr);
assert.equal(flat['必殺技'].rows.find((r) => r['技名'] === '博麗アミュレット')['攻撃属性'], '射撃');

console.log(JSON.stringify({ ok: true, patched, reisenPatched: r2.patched }, null, 2));
