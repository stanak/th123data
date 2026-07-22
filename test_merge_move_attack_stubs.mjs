#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  isAttackInfoStub,
  lvOverlaps,
  commandsMatch,
  mergeMoveAttackStubs,
} from './merge_move_attack_stubs.mjs';
import { flattenCharacter } from './flatten_frame_data.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

assert.equal(isAttackInfoStub({ 技名: '繋縛陣', 攻撃Lv: '大', 攻撃分類: '上段' }), true);
assert.equal(isAttackInfoStub({ 技名: '繋縛陣', 攻撃Lv: '大', 動作: { 発生: '1' } }), false);
assert.equal(lvOverlaps('1~3', '2'), true);
assert.equal(lvOverlaps('1~3', '4'), false);
assert.equal(commandsMatch('214', '214B'), true);
assert.equal(commandsMatch('22', '236B'), false);

const merged = mergeMoveAttackStubs([
  {
    技名: '繋縛陣',
    コマンド: '214',
    Lv: '1~4',
    攻撃Lv: '大',
    攻撃分類: '上段',
  },
  {
    技名: '繋縛陣',
    コマンド: '214B',
    Lv: '1~4',
    状態: [{ 技名: '地上', 動作: { 発生: '35' } }],
  },
  {
    技名: '繋縛陣',
    コマンド: '214C',
    Lv: '1~4',
    状態: [{ 技名: '地上', 動作: { 発生: '35' } }],
  },
]);
assert.equal(merged.length, 2);
assert.equal(merged[0]['攻撃Lv'], '大');
assert.equal(merged[1]['攻撃分類'], '上段');

const reimu = flattenCharacter(
  JSON.parse(fs.readFileSync(path.join(__dirname, 'chars/霊夢.json'), 'utf8')),
);
const specials = reimu.frameData['フレームデータ']['必殺技'].rows;
assert.equal(specials.filter(isAttackInfoStub).length, 1);
const keibaku = specials.filter((r) => r['技名'] === '繋縛陣');
assert.ok(keibaku.every((r) => r['攻撃Lv'] === '大' && r['攻撃分類'] === '上段'));
assert.ok(!specials.some((r) => isAttackInfoStub(r) && r['技名'] === '繋縛陣'));

console.log(JSON.stringify({
  ok: true,
  reimuStubsLeft: specials.filter(isAttackInfoStub).length,
  keibakuRows: keibaku.length,
}, null, 2));
