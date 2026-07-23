#!/usr/bin/env node
import assert from 'node:assert/strict';
import { firstFrameListToken, parseFrameValue } from './frame_parse.mjs';

assert.equal(firstFrameListToken('15,18,21,24,27'), '15');
assert.equal(firstFrameListToken('15,20,25,...'), '15');
assert.equal(firstFrameListToken('39,42,...,57'), '39');
assert.equal(firstFrameListToken('15、18、21'), '15');

assert.equal(parseFrameValue('15,18,21,24,27'), 15);
assert.equal(parseFrameValue('15,20,25,...'), 15);
assert.equal(parseFrameValue('39,42,...,57'), 39);
assert.equal(parseFrameValue('117,119,...,147'), 117);
assert.equal(parseFrameValue('101,121'), 101);
assert.equal(parseFrameValue('13'), 13);
assert.equal(parseFrameValue('8[12]'), 8);
assert.equal(parseFrameValue('±3'), 0);
assert.equal(parseFrameValue('-'), null);

console.log(JSON.stringify({ ok: true }, null, 2));
