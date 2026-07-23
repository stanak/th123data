#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isOrphanTableRow, removeCharacterOrphanTableRows } from './remove_orphan_table_rows.mjs';

assert.equal(
  isOrphanTableRow({
    コマンド: '214',
    相手キャラ: '萃香',
    対立ち: { ヒット: '34', 有利差: '-2' },
    対しゃがみ: { ヒット: '35', 有利差: '+3' },
  }),
  true,
);

assert.equal(
  isOrphanTableRow({
    技名: '頭上花剪斬',
    コマンド: '214B',
    動作: { 発生: '33' },
  }),
  false,
);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'frame_data.json'), 'utf8'));

let ghosts = 0;
for (const char of Object.values(data.characters)) {
  for (const section of Object.values(char)) {
    if (!section?.rows) continue;
    ghosts += section.rows.filter(isOrphanTableRow).length;
  }
}
assert.equal(ghosts, 0, 'frame_data should not contain orphan table rows');

console.log(JSON.stringify({ ok: true }, null, 2));
