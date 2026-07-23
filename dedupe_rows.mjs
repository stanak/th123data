#!/usr/bin/env node
import { getCharacterCategories } from './character_frame.mjs';
/** Remove consecutive or non-consecutive fully identical rows. */

function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

export function dedupeRows(rows) {
  if (!Array.isArray(rows) || !rows.length) return rows;

  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const sig = stableStringify(row);
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(row);
  }
  return out;
}

export function dedupeCharacterRows(char) {
  const categories = getCharacterCategories(char);

  for (const section of Object.values(categories)) {
    if (!section?.rows) continue;
    section.rows = dedupeRows(section.rows);
  }
  return char;
}
