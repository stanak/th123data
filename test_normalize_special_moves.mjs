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

assert.deepEqual(parseSpecialMoveName('ホールド6B系（1段階）-6B（1段階）'), {
  baseName: 'H6B',
  variant: null,
  hold: true,
  stateLabel: '1段階',
  namedHoldMove: true,
  changed: true,
});
assert.deepEqual(parseSpecialMoveName('ホールド6B系（1段階）-J6B（1段階）').baseName, 'HJ6B');
assert.equal(parseSpecialMoveName('ホールド6B系（2段階）-J2B（2段階）').stateLabel, '2段階');
assert.equal(parseSpecialMoveName('ホールド6B系-H6B').baseName, 'H6B');
assert.equal(parseSpecialMoveName('ホールド6B系-H6B').namedHoldMove, true);

const hold6b = normalizeSpecialMoveRows([
  { 技名: 'ホールド6B系（1段階）-6B（1段階）', 動作: { 発生: '30' } },
  { 技名: 'ホールド6B系（2段階）-6B（2段階）', 動作: { 発生: '60' } },
  { 技名: 'ホールド6B系（1段階）-J6B（1段階）', 動作: { 発生: '31' } },
  { 技名: 'ホールド6B系（2段階）-J6B（2段階）', 動作: { 発生: '61' } },
]);
assert.equal(hold6b.length, 2);
const h6b = hold6b.find((r) => r['技名'] === 'H6B');
assert.ok(h6b?.['状態']);
assert.deepEqual(h6b['状態'].map((s) => s['技名']), ['1段階', '2段階']);
const hj6b = hold6b.find((r) => r['技名'] === 'HJ6B');
assert.deepEqual(hj6b['状態'].map((s) => s['技名']), ['1段階', '2段階']);

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
const heart = youmu['必殺技'].rows.find((r) => r['技名'] === '心抄斬');
assert.ok(heart);
assert.ok(heart['Lv']['1']['214B']['状態']['突進']);
assert.ok(heart['Lv']['1']['214C']['状態']['突進']);

const reimu = flattenCharacter(
  JSON.parse(fs.readFileSync(path.join(__dirname, 'chars/霊夢.json'), 'utf8')),
);
const jyoushi = reimu['必殺技'].rows.find((r) => r['技名'] === '常置陣');
assert.ok(jyoushi);
assert.ok(jyoushi['Lv']['1']['214B']['状態']['設置']);
assert.ok(jyoushi['Lv']['1']['214C']['状態']['設置']);

const meishu = reimu['スペルカード'].rows.find((r) => r['技名'] === '明珠暗投');
assert.ok(meishu);
assert.ok(meishu['Lv']['']['']['位置']['地上']);
assert.ok(meishu['Lv']['']['']['位置']['空中']);
assert.ok(!reimu['スペルカード'].rows.some((r) => r['技名']?.includes('版')));

const suwako = flattenCharacter(
  JSON.parse(fs.readFileSync(path.join(__dirname, 'chars/諏訪子.json'), 'utf8')),
);
const suwakoShooting = suwako['射撃技'].rows;
const suwakoH6b = suwakoShooting.find((r) => r['技名'] === 'H6B');
assert.ok(suwakoH6b, 'H6B move');
assert.ok(suwakoH6b['Lv']['']['']['状態']['1段階']);
assert.ok(suwakoH6b['Lv']['']['']['状態']['2段階']);
const suwakoHj2b = suwakoShooting.find((r) => r['技名'] === 'HJ2B');
assert.ok(suwakoHj2b);
assert.ok(suwakoHj2b['Lv']['']['']['状態']['1段階']);
assert.ok(suwakoHj2b['Lv']['']['']['状態']['2段階']);
assert.ok(!suwakoShooting.some((r) => r['技名']?.includes('ホールド6B系')));

assert.equal(parseSpecialMoveName('立ちしゃがみ共通BC共通土着神の祟り').baseName, '土着神の祟り');
assert.equal(parseSpecialMoveName('立ちしゃがみ共通BC共通土着神の祟り').stateLabel, null);
assert.equal(parseSpecialMoveName('立ちしゃがみ共通BC共通土着神の祟り').variant, 'BC');

const tsuchijin = suwako['必殺技'].rows.find((r) => r['技名'] === '土着神の祟り');
assert.ok(tsuchijin, '土着神の祟り');
assert.ok(tsuchijin['Lv']['0']['22B']['_']['動作'], 'no position bucket for 立ちしゃがみ');
assert.equal(tsuchijin['Lv']['0']['22B']['位置'], undefined);

console.log(JSON.stringify({ ok: true, heartLvKeys: Object.keys(heart['Lv']) }, null, 2));
