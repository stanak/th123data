#!/usr/bin/env node
import assert from 'node:assert/strict';
import { normalizeMovePositionRows } from './normalize_move_position.mjs';
import { nestMoveStates } from './nest_move_states.mjs';
import { mergeFlatMovesByName, mergeMovesByName } from './merge_moves_by_name.mjs';
import { isNestedMoveRow } from './lv_utils.mjs';

const nearA = mergeFlatMovesByName([
  {
    技名: '近A',
    動作: { 発生: '8', 持続: '2', 全体: '18' },
    有利差: { 正G: '-1', 通常: '±0' },
  },
]);
assert.equal(nearA.length, 1);
assert.equal(nearA[0]['技名'], '近A');
assert.equal(nearA[0]['動作']['発生'], '8');
assert.equal(nearA[0].Lv, undefined);
assert.equal(nearA[0]['コマンド'], undefined);

const segments = mergeFlatMovesByName(nestMoveStates([
  { 技名: '2A-1段目', 動作: { 発生: '9' } },
  { 技名: '2A-2段目', 動作: { 発生: '12' } },
]));
assert.equal(segments.length, 1);
assert.equal(segments[0]['技名'], '2A');
assert.equal(segments[0]['状態'].length, 2);
assert.equal(segments[0]['状態'][0]['技名'], '1段目');
assert.equal(segments[0].Lv, undefined);

const positions = mergeFlatMovesByName(normalizeMovePositionRows([
  { 技名: '明珠暗投（地上版）', 動作: { 発生: '27' } },
  { 技名: '明珠暗投（空中版）', 動作: { 発生: '28' } },
]));
assert.equal(positions.length, 1);
assert.equal(positions[0]['技名'], '明珠暗投');
assert.equal(positions[0]['状態'].length, 2);
assert.equal(positions[0]['状態'][0]['技名'], '地上');
assert.equal(positions[0]['状態'][1]['技名'], '空中');

const nestedShell = mergeFlatMovesByName([
  {
    技名: '近A',
    Lv: { '': { '': { _: { 動作: { 発生: '8' } } } } },
    動作: { 発生: '8' },
  },
]);
assert.equal(nestedShell[0].Lv, undefined);
assert.equal(nestedShell[0]['動作']['発生'], '8');

const special = mergeMovesByName([
  { 技名: '生死流転斬', コマンド: '214B', Lv: '0', 動作: { 発生: '19' } },
  { 技名: '生死流転斬', コマンド: '214C', Lv: '2', 動作: { 発生: '24' } },
]);
assert.ok(isNestedMoveRow(special[0]));
assert.equal(special[0]['Lv']['0']['214B']['_']['動作']['発生'], '19');

console.log('test_merge_flat_moves_by_name: ok');
