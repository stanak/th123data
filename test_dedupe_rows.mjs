#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { flattenCharacter } from './flatten_frame_data.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function countExactDupes(rows) {
  const seen = new Set();
  let dupes = 0;
  for (const row of rows) {
    const sig = JSON.stringify(row);
    if (seen.has(sig)) dupes++;
    else seen.add(sig);
  }
  return dupes;
}

function countAllDupes(data) {
  let total = 0;
  for (const char of Object.values(data.characters)) {
    const frame = char.frameData?.['フレームデータ'];
    if (!frame) continue;
    for (const sec of Object.values(frame)) {
      total += countExactDupes(sec.rows || []);
    }
  }
  return total;
}

const marisa = flattenCharacter(
  JSON.parse(fs.readFileSync(path.join(__dirname, 'chars/魔理沙.json'), 'utf8')),
);
const marisa2A = marisa.frameData['フレームデータ']['通常技'].rows.filter((r) => r['技名'] === '2A').length;

const frameData = JSON.parse(fs.readFileSync(path.join(__dirname, 'frame_data.json'), 'utf8'));

console.log(JSON.stringify({
  marisa2A,
  exactDupesInFrameData: countAllDupes(frameData),
}, null, 2));

if (marisa2A !== 1) process.exitCode = 1;
if (countAllDupes(frameData) !== 0) process.exitCode = 1;
