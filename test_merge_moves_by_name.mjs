#!/usr/bin/env node
import assert from 'node:assert/strict';
import { expandLvRanges } from './expand_lv_ranges.mjs';
import { mergeMovesByName } from './merge_moves_by_name.mjs';
import { isNestedMoveRow } from './lv_utils.mjs';

const flat = expandLvRanges([
  {
    技名: '生死流転斬',
    コマンド: '214B',
    Lv: '0',
    状態: [{ 技名: '1段目', 動作: { 発生: '19' }, コマンド: '214B', Lv: '0' }],
  },
  {
    技名: '生死流転斬',
    コマンド: '214B',
    Lv: '1~2',
    状態: [{ 技名: '1段目', 動作: { 発生: '20' }, コマンド: '214B', Lv: '1~2' }],
  },
  {
    技名: '生死流転斬',
    コマンド: '214C',
    Lv: '0',
    状態: [{ 技名: '1段目', 動作: { 発生: '22' }, コマンド: '214C', Lv: '0' }],
  },
]);

const merged = mergeMovesByName(flat);
assert.equal(merged.length, 1);
assert.ok(isNestedMoveRow(merged[0]));
assert.equal(merged[0]['技名'], '生死流転斬');
assert.equal(merged[0]['Lv']['0']['214B']['1段目']['動作']['発生'], '19');
assert.equal(merged[0]['Lv']['1']['214B']['1段目']['動作']['発生'], '20');
assert.equal(merged[0]['Lv']['2']['214B']['1段目']['動作']['発生'], '20');
assert.equal(merged[0]['Lv']['0']['214C']['1段目']['動作']['発生'], '22');
assert.equal(merged[0]['Lv']['0']['214B']['1段目']['コマンド'], undefined);

console.log('test_merge_moves_by_name: ok');
