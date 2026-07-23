#!/usr/bin/env node
import assert from 'node:assert/strict';
import { resolveDittoRows, resolveDittoValue } from './resolve_ditto.mjs';
import { flattenCharacter } from './flatten_frame_data.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

assert.equal(resolveDittoValue('〃', '23'), '23');
assert.deepEqual(resolveDittoValue('〃', { 上位: '28' }), { 上位: '28' });

const rows = resolveDittoRows([
  {
    技名: 'A',
    キャンセル: { 上位: '23', 移動: '30' },
    攻撃Lv: '大',
  },
  {
    技名: 'B',
    キャンセル: { 上位: '〃', 移動: '〃' },
    攻撃Lv: '〃',
  },
]);
assert.equal(rows[1]['キャンセル']['上位'], '23');
assert.equal(rows[1]['攻撃Lv'], '大');

const states = resolveDittoRows([
  {
    技名: '技',
    Lv: '1',
    状態: [{ 技名: '溜め1段階', 備考: 'ホールド解除で射出' }],
  },
  {
    技名: '技',
    Lv: '1',
    状態: [{ 技名: '溜め2段階', 備考: '〃' }],
  },
]);
assert.equal(states[1]['状態'][0]['備考'], 'ホールド解除で射出');

const states2 = resolveDittoRows([
  {
    技名: '技',
    Lv: '1',
    状態: [{ 技名: '爆発', キャンセル: { 上位: '28', 移動: '39' } }],
  },
  {
    技名: '技',
    Lv: '2',
    状態: [{ 技名: '爆発', キャンセル: { 上位: '〃', 移動: '〃' } }],
  },
]);
assert.equal(states2[1]['状態'][0]['キャンセル']['上位'], '28');

const reimu = flattenCharacter(
  JSON.parse(fs.readFileSync(path.join(__dirname, 'chars/霊夢.json'), 'utf8')),
);
const air = reimu['スペルカード'].rows.find(
  (r) => r['技名'] === '明珠暗投',
);
assert.equal(air['Lv']['']['']['位置']['空中']['受身不能'], '60');
assert.equal(air['Lv']['']['']['位置']['空中']['攻撃Lv'], '大');

console.log(JSON.stringify({ ok: true }, null, 2));
