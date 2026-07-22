import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'characters.json'), 'utf8'));

export const CHARACTER_ORDER = data.order;
export const CHARACTER_EN = data.en;

export function sortCharacters(names) {
  const set = new Set(names);
  const ordered = CHARACTER_ORDER.filter((n) => set.has(n));
  for (const n of names) {
    if (!CHARACTER_ORDER.includes(n)) ordered.push(n);
  }
  return ordered;
}

export function orderedCharactersFromRecord(record) {
  return sortCharacters(Object.keys(record));
}
