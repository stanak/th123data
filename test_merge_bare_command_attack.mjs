#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  mergeBareIntoBc,
  mergeLvCommandBucket,
  mergeNestedMoveBareCommands,
  isBcVariantOfBare,
} from './merge_bare_command_attack.mjs';
import { flattenCharacter } from './flatten_frame_data.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

assert.equal(isBcVariantOfBare('421', '421B'), true);
assert.equal(isBcVariantOfBare('421', '421HB'), true);
assert.equal(isBcVariantOfBare('421', '214B'), false);

const bucket = {
  '421': {
    状態: {
      反撃弾射出: { 攻撃Lv: '大', 攻撃分類: '上段' },
      反撃弾展開: { 攻撃Lv: '-', 攻撃分類: '-' },
    },
  },
  '421B': {
    状態: {
      当身: { 動作: { 全体: '61' } },
      反撃弾: { 動作: { 全体: '35' }, 攻撃Lv: '-', 攻撃分類: '-' },
    },
  },
  '421C': {
    状態: {
      反撃弾: { 動作: { 全体: '35' } },
    },
  },
};

mergeBareIntoBc(bucket['421'], bucket['421B']);
mergeBareIntoBc(bucket['421'], bucket['421C']);
assert.equal(bucket['421B']['状態']['反撃弾']['攻撃Lv'], '大');
assert.equal(bucket['421B']['状態']['反撃弾']['攻撃分類'], '上段');
assert.equal(bucket['421C']['状態']['反撃弾']['攻撃Lv'], '大');
assert.equal(bucket['421C']['状態']['反撃弾']['攻撃分類'], '上段');

mergeLvCommandBucket(bucket);
assert.equal(bucket['421'], undefined);

const orphanBucket = {
  '421': { _: { 攻撃Lv: '中', 攻撃分類: '上段' } },
  '214B': { 状態: { 設置: { 攻撃Lv: '大', 攻撃分類: '上段', 動作: { 全体: '61' } } } },
  '214C': { 状態: { 設置: { 攻撃Lv: '大', 攻撃分類: '上段' } } },
};
mergeLvCommandBucket(orphanBucket);
assert.equal(orphanBucket['421'], undefined);
assert.equal(orphanBucket['214B']['状態']['設置']['攻撃Lv'], '大');

const nested = {
  技名: '反射下界斬',
  Lv: {
    1: {
      '236': { 状態: { 反撃弾: { 攻撃Lv: '中', 攻撃分類: '射撃' } } },
      '236B': { 状態: { 反撃弾: { 攻撃Lv: '-', 攻撃分類: '-' } } },
      '236C': { _: { 攻撃Lv: '-', 攻撃分類: '-' } },
    },
  },
};
mergeNestedMoveBareCommands(nested);
assert.equal(nested['Lv']['1']['236'], undefined);
assert.equal(nested['Lv']['1']['236B']['状態']['反撃弾']['攻撃Lv'], '中');
assert.equal(nested['Lv']['1']['236C']['_']['攻撃Lv'], '中');

const youmu = flattenCharacter(
  JSON.parse(fs.readFileSync(path.join(__dirname, 'chars/妖夢.json'), 'utf8')),
);
const hansha = youmu['必殺技'].rows.find((r) => r['技名'] === '反射下界斬');
assert.ok(hansha?.Lv);
const hanshaLv = hansha['Lv']['0'] ?? hansha['Lv']['1'] ?? Object.values(hansha['Lv'])[0];
assert.equal(hanshaLv['236'], undefined);
assert.ok(hanshaLv['236B'] || hanshaLv['236C']);

const reimu = flattenCharacter(
  JSON.parse(fs.readFileSync(path.join(__dirname, 'chars/霊夢.json'), 'utf8')),
);
const setsuna = reimu['必殺技'].rows.find((r) => r['技名'] === '刹那亜空穴');
assert.ok(setsuna?.Lv?.['1']);
assert.equal(setsuna['Lv']['1']['421'], undefined);
assert.equal(setsuna['Lv']['1']['421B']['状態']['反撃弾']['攻撃Lv'], '大');

const jyoushi = reimu['必殺技'].rows.find((r) => r['技名'] === '常置陣');
assert.equal(jyoushi['Lv']['1']['421'], undefined);
assert.ok(jyoushi['Lv']['1']['214B']);

console.log(JSON.stringify({ ok: true }, null, 2));
