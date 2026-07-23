#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  wikiAttackAttrNameVariants,
  normalizeWikiAttackAttrMoveName,
} from './wiki_attack_attr_name.mjs';

assert.deepEqual(wikiAttackAttrNameVariants('珠符「明珠暗投」'), ['明珠暗投']);
assert.ok(wikiAttackAttrNameVariants('惑見「離円花冠（カローラヴィジョン）」').includes('カローラヴィジョン'));
assert.equal(normalizeWikiAttackAttrMoveName('地獄の人工太陽'), '地獄の人口太陽');
assert.equal(normalizeWikiAttackAttrMoveName('フリーズアトモスフェア'), 'フリーズアトモスフィア');

console.log('test_wiki_attack_attr_name: ok');
