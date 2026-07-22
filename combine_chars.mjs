#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { flattenCharacter } from './flatten_frame_data.mjs';

const CHAR_DIR = '/home/starnak/bulletaction-frame-data/chars';
const OUT = '/home/starnak/bulletaction-frame-data/frame_data.json';

const files = fs.readdirSync(CHAR_DIR).filter((f) => f.endsWith('.json'));
const characters = {};
for (const file of files.sort()) {
  const name = file.replace(/\.json$/, '');
  const raw = JSON.parse(fs.readFileSync(path.join(CHAR_DIR, file), 'utf8'));
  characters[name] = flattenCharacter(raw);
}

fs.writeFileSync(OUT, JSON.stringify({ characters }, null, 2), 'utf8');
console.log(JSON.stringify({
  path: OUT,
  characterCount: Object.keys(characters).length,
  aliceRows: characters['アリス']?.frameData?.['フレームデータ']?.['必殺技']?.rows?.length,
}, null, 2));
