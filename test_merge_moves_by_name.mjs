#!/usr/bin/env node
import assert from 'node:assert/strict';
import { expandLvRanges } from './expand_lv_ranges.mjs';
import { normalizeMovePositionRows } from './normalize_move_position.mjs';
import { mergeMovesByName } from './merge_moves_by_name.mjs';

const flat = normalizeMovePositionRows(expandLvRanges([
  {
    技名: '生死流転斬',
    コマンド: '214B',
    Lv: '0',
    状態: [{ 技名: '1段目', 動作: { 発生: '19' } }],
  },
  {
    技名: '生死流転斬',
    コマンド: '214C',
    Lv: '2',
    状態: [{ 技名: 'Cフィニッシュ', 動作: { 発生: '24' } }],
  },
  {
    技名: '明珠暗投（地上版）',
    Lv: '0',
    動作: { 発生: '27' },
  },
  {
    技名: '明珠暗投（空中版）',
    Lv: '0',
    動作: { 発生: '27' },
  },
]));

const merged = mergeMovesByName(flat);
const seishi = merged.find((r) => r['技名'] === '生死流転斬');
const meishu = merged.find((r) => r['技名'] === '明珠暗投');

assert.equal(seishi['Lv']['0']['214B']['段']['1']['動作']['発生'], '19');
assert.equal(seishi['Lv']['2']['214C']['状態']['Cフィニッシュ']['動作']['発生'], '24');
assert.equal(meishu['Lv']['0']['']['位置']['地上']['動作']['発生'], '27');
assert.equal(meishu['Lv']['0']['']['位置']['空中']['動作']['発生'], '27');

console.log('test_merge_moves_by_name: ok');
