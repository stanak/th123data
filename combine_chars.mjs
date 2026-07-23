#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { flattenCharacter } from './flatten_frame_data.mjs';
import { CHARACTER_ORDER } from './characters.mjs';
import { patchYoumuSpellStates } from './patch_youmu_spell_states.mjs';
import { patchYoumuMoveNames } from './patch_youmu_move_names.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHAR_DIR = path.join(__dirname, 'chars');
const OUT = path.join(__dirname, 'frame_data.json');

const characters = {};
for (const name of CHARACTER_ORDER) {
  const file = path.join(CHAR_DIR, `${name}.json`);
  if (!fs.existsSync(file)) {
    console.warn('missing char file:', name);
    continue;
  }
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  characters[name] = patchYoumuMoveNames(patchYoumuSpellStates(flattenCharacter(raw), name), name);
}

fs.writeFileSync(OUT, JSON.stringify({ characters }, null, 2), 'utf8');
console.log(JSON.stringify({
  path: OUT,
  characterCount: Object.keys(characters).length,
  aliceRows: characters['アリス']?.['必殺技']?.rows?.length,
}, null, 2));
