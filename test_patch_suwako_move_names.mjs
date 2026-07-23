#!/usr/bin/env node
import assert from 'node:assert/strict';
import { patchSuwakoMoveNames } from './patch_suwako_move_names.mjs';

const char = {
  通常技: {
    rows: [
      { 技名: '2A' },
      { 技名: '屈6A' },
      { 技名: '屈3A' },
    ],
  },
};

patchSuwakoMoveNames(char, '諏訪子');
assert.deepEqual(char.通常技.rows.map((r) => r.技名), ['2A(LA)', 'L6A', 'L3A']);

patchSuwakoMoveNames({ 通常技: { rows: [{ 技名: '2A' }] } }, '霊夢');
assert.equal(char.通常技.rows[0].技名, '2A(LA)');

console.log(JSON.stringify({ ok: true }, null, 2));
