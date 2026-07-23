#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  expandWikiBulletTargets,
  normalizeWikiBulletInput,
} from './wiki_bullet_name.mjs';

assert.equal(normalizeWikiBulletInput('立B'), 'B');
assert.equal(normalizeWikiBulletInput('+B'), '6B');
assert.equal(normalizeWikiBulletInput('屈B'), '2B');
assert.equal(normalizeWikiBulletInput('JpB'), 'JB');
assert.equal(normalizeWikiBulletInput('Jp+B'), 'J2B');
assert.equal(normalizeWikiBulletInput('ホールド立C'), 'HC');
assert.equal(normalizeWikiBulletInput('屈C'), '2C');
assert.equal(normalizeWikiBulletInput('+C'), '6C');
assert.equal(normalizeWikiBulletInput('Jp+C', '+C系射撃（+C、Jp+C）'), 'J6C');
assert.equal(normalizeWikiBulletInput('Jp+C', '屈C系射撃（屈C、Jp+C）'), 'J2C');

const bGroup = expandWikiBulletTargets(
  'B系射撃（立B、+B、屈B、JpB、Jp+B）',
  'B系射撃（立B、+B、屈B、JpB、Jp+B）',
);
assert.ok(bGroup.includes('B'));
assert.ok(bGroup.includes('6B'));
assert.ok(bGroup.includes('2B'));
assert.ok(bGroup.includes('JB'));
assert.ok(bGroup.includes('J2B'));
assert.ok(bGroup.includes('HB'));
assert.ok(bGroup.includes('H6B'));

const cFront = expandWikiBulletTargets('C系射撃（立C、JpC）', '前半部分');
assert.ok(cFront.includes('C'));
assert.ok(cFront.includes('JC'));

console.log(JSON.stringify({ ok: true }, null, 2));
