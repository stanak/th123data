#!/usr/bin/env node
import assert from 'node:assert/strict';
import { collapseLvEntries } from './lv_utils.mjs';

const collapsed = collapseLvEntries([
  { lv: 1, stats: { 動作: { 発生: '19' } } },
  { lv: 2, stats: { 動作: { 発生: '19' } } },
  { lv: 3, stats: { 動作: { 発生: '21' } } },
]);

assert.equal(collapsed.length, 2);
assert.equal(collapsed[0].lvDisplay, '1~2');
assert.equal(collapsed[1].lvDisplay, '3');

console.log('test_lv_utils: ok');
