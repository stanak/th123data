#!/usr/bin/env node
import assert from 'node:assert/strict';
import { propagateParentAttackInfoRows } from './propagate_parent_attack_info.mjs';
import { extractParentStats } from './build_index.mjs';
import { flattenCharacter } from './flatten_frame_data.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const propagated = propagateParentAttackInfoRows([
  {
    技名: '繋縛陣',
    コマンド: '214B',
    Lv: '1~4',
    攻撃Lv: '大',
    攻撃分類: '上段',
    状態: [{ 技名: '地上', 動作: { 発生: '35' } }],
  },
]);
assert.equal(propagated[0]['状態'][0]['攻撃Lv'], '大');
assert.equal(propagated[0]['状態'][0]['攻撃分類'], '上段');

assert.equal(
  extractParentStats({
    技名: '繋縛陣',
    コマンド: '214B',
    攻撃Lv: '大',
    攻撃分類: '上段',
    状態: [],
  }),
  null,
);

assert.deepEqual(
  extractParentStats({
    技名: '常置陣',
    コマンド: '214B',
    攻撃Lv: '大',
    備考: '親のみ',
    状態: [{ 技名: '設置', 動作: { 発生: '1' } }],
  }),
  { 備考: '親のみ' },
);

const reimu = flattenCharacter(
  JSON.parse(fs.readFileSync(path.join(__dirname, 'chars/霊夢.json'), 'utf8')),
);
const keibaku = reimu['必殺技'].rows.find((r) => r['技名'] === '繋縛陣');
assert.equal(keibaku['Lv']['1']['214B']['位置']['地上']['攻撃Lv'], '大');

console.log(JSON.stringify({ ok: true }, null, 2));
