#!/usr/bin/env node
import { flattenCharacter } from './flatten_frame_data.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'chars/霊夢.json'), 'utf8'));
const flat = flattenCharacter(raw);
const rows = flat.frameData['フレームデータ']['通常技'].rows;
const twoA = rows.find((r) => r['技名'] === '2A');
const hyphenLeft = rows.some((r) => String(r['技名']).includes('-') && /段目$/.test(String(r['技名'])));

console.log(JSON.stringify({
  has2A: !!twoA,
  stateCount: twoA?.['状態']?.length ?? 0,
  firstState: twoA?.['状態']?.[0]?.['技名'],
  hyphenRowsRemain: hyphenLeft,
}, null, 2));
