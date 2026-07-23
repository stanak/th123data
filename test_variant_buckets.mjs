#!/usr/bin/env node
import assert from 'node:assert/strict';
import { classifyVariantLabel } from './variant_buckets.mjs';
import { parseMoveNamePosition } from './normalize_move_position.mjs';

assert.deepEqual(classifyVariantLabel('1段目'), { bucket: '段', key: '1' });
assert.deepEqual(classifyVariantLabel('地上'), { bucket: '位置', key: '地上' });
assert.deepEqual(classifyVariantLabel('突進'), { bucket: '状態', key: '突進' });

assert.deepEqual(parseMoveNamePosition('明珠暗投（地上版）'), {
  baseName: '明珠暗投',
  position: '地上',
  stateFromName: null,
  changed: true,
});
assert.deepEqual(parseMoveNamePosition('夢想封印（空中版）-直進弾'), {
  baseName: '夢想封印',
  position: '空中',
  stateFromName: '直進弾',
  changed: true,
});

console.log('test_variant_buckets: ok');
