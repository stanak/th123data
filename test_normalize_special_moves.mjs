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
  stateLabel: '突進',
  changed: true,
});
assert.deepEqual(parseSpecialMoveName('C版生死流転斬（1段目）').baseName, '生死流転斬');
assert.equal(parseSpecialMoveName('C版生死流転斬（1段目）').stateLabel, '1段目');
assert.equal(parseSpecialMoveName('C版生死流転斬（1段目）').variant, 'C');
assert.equal(suffixCommand('214', 'B'), '214B');

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
const heart = youmu.frameData['フレームデータ']['必殺技'].rows.filter((r) => r['技名'] === '心抄斬');
assert.ok(heart.some((r) => r['コマンド'] === '214B' && r['状態']?.some((s) => s['技名'] === '突進')));
assert.ok(heart.some((r) => r['コマンド'] === '214C'));

const reimu = flattenCharacter(
  JSON.parse(fs.readFileSync(path.join(__dirname, 'chars/霊夢.json'), 'utf8')),
);
const jyoushi = reimu.frameData['フレームデータ']['必殺技'].rows.filter((r) => r['技名'] === '常置陣');
assert.ok(jyoushi.some((r) => r['コマンド'] === '214B' && r['状態']));
assert.ok(jyoushi.some((r) => r['コマンド'] === '214C'));

console.log(JSON.stringify({ ok: true, heart: heart.length, jyoushi: jyoushi.length }, null, 2));
