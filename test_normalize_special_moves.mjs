#!/usr/bin/env node
import assert from 'node:assert/strict';
import { parseSpecialMoveName, suffixCommand, normalizeSpecialMoveRows } from './normalize_special_moves.mjs';
import { flattenCharacter } from './flatten_frame_data.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

assert.deepEqual(parseSpecialMoveName('B版心抄斬-突進'), {
  baseName: '心抄斬',
  variant: 'B',
  hold: false,
  stateLabel: '突進',
  changed: true,
});
assert.deepEqual(parseSpecialMoveName('C版生死流転斬（1段目）').baseName, '生死流転斬');
assert.equal(parseSpecialMoveName('C版生死流転斬（1段目）').stateLabel, '1段目');
assert.equal(parseSpecialMoveName('C版生死流転斬（1段目）').variant, 'C');
assert.equal(suffixCommand('214', 'B'), '214B');
assert.equal(suffixCommand('214', 'B', true), '214HB');
assert.equal(suffixCommand('214', 'C', true), '214HC');
assert.equal(parseSpecialMoveName('ホールド版地上BC共通メテオニックデブリ').baseName, 'メテオニックデブリ');
assert.equal(parseSpecialMoveName('ホールド版地上BC共通メテオニックデブリ').hold, true);
assert.equal(parseSpecialMoveName('ホールドB版スクウェアリコシェ').variant, 'B');
assert.equal(parseSpecialMoveName('ホールドB版スクウェアリコシェ').hold, true);

const hold = normalizeSpecialMoveRows([
  { 技名: 'ホールド版地上BC共通メテオニックデブリ', コマンド: '236', Lv: '0', 動作: { 発生: '42' } },
]);
assert.equal(hold.length, 2);
assert.equal(hold[0]['技名'], 'メテオニックデブリ');
assert.equal(hold[0]['コマンド'], '236HB');
assert.equal(hold[1]['コマンド'], '236HC');
assert.equal(hold[0]['状態'][0]['技名'], '地上');

const holdB = normalizeSpecialMoveRows([
  { 技名: 'ホールドB版スクウェアリコシェ', コマンド: '214', Lv: '1~4', 動作: { 発生: '1' } },
]);
assert.equal(holdB.length, 1);
assert.equal(holdB[0]['コマンド'], '214HB');

const grouped = normalizeSpecialMoveRows([
  { 技名: 'B版心抄斬-突進', コマンド: '214', Lv: '1~4', 動作: { 発生: '25' } },
  { 技名: 'B版心抄斬-停止動作', コマンド: '214', Lv: '1~4', 動作: { 発生: '-' } },
]);
assert.equal(grouped.length, 1);
assert.equal(grouped[0]['技名'], '心抄斬');
assert.equal(grouped[0]['コマンド'], '214B');
assert.equal(grouped[0]['状態'].length, 2);
assert.equal(grouped[0]['状態'][0]['技名'], '突進');

const bc = normalizeSpecialMoveRows([
  { 技名: '地上BC共通警醒陣', コマンド: '214', Lv: '0' },
]);
assert.equal(bc.length, 2);
assert.equal(bc[0]['コマンド'], '214B');
assert.equal(bc[1]['コマンド'], '214C');
assert.equal(bc[0]['状態'][0]['技名'], '地上');

const youmu = flattenCharacter(
  JSON.parse(fs.readFileSync(path.join(__dirname, 'chars/妖夢.json'), 'utf8')),
);
const heart = youmu.frameData['フレームデータ']['必殺技'].rows.find((r) => r['技名'] === '心抄斬');
assert.ok(heart);
assert.ok(heart['Lv']['1']['214B']['突進']);
assert.ok(heart['Lv']['1']['214C']['突進']);

const reimu = flattenCharacter(
  JSON.parse(fs.readFileSync(path.join(__dirname, 'chars/霊夢.json'), 'utf8')),
);
const jyoushi = reimu.frameData['フレームデータ']['必殺技'].rows.find((r) => r['技名'] === '常置陣');
assert.ok(jyoushi);
assert.ok(jyoushi['Lv']['1']['214B']['設置']);
assert.ok(jyoushi['Lv']['1']['214C']['設置']);

console.log(JSON.stringify({ ok: true, heartLvKeys: Object.keys(heart['Lv']) }, null, 2));
