#!/usr/bin/env node
import assert from 'node:assert/strict';
import { expandLvRanges } from './expand_lv_ranges.mjs';

const expanded = expandLvRanges([
  {
    技名: 'テスト',
    コマンド: '214B',
    Lv: '1~2',
    状態: [{ 技名: '1段目', Lv: '1~2', 動作: { 発生: '19' } }],
  },
]);

assert.equal(expanded.length, 2);
assert.equal(expanded[0]['Lv'], '1');
assert.equal(expanded[1]['Lv'], '2');
assert.equal(expanded[0]['状態'][0]['Lv'], '1');
assert.equal(expanded[1]['状態'][0]['Lv'], '2');

const single = expandLvRanges([{ 技名: '単発', Lv: '0', 動作: { 発生: '5' } }]);
assert.equal(single.length, 1);
assert.equal(single[0]['Lv'], '0');

console.log('test_expand_lv_ranges: ok');
