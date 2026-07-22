#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { walkAndNormalize } from './normalize_move.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHAR_DIR = path.join(__dirname, 'chars');

for (const file of fs.readdirSync(CHAR_DIR).filter((f) => f.endsWith('.json'))) {
  const p = path.join(CHAR_DIR, file);
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  walkAndNormalize(data);
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
  console.log('normalized', file.replace(/\.json$/, ''));
}
