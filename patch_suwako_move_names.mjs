#!/usr/bin/env node
/** 諏訪子: 地中通常技の技名を L系にし、2A に (LA) を追記する。 */

import { getCharacterCategories } from './character_frame.mjs';

const RENAME = {
  屈6A: 'L6A',
  屈3A: 'L3A',
};

export function patchSuwakoMoveNames(char, characterName) {
  if (characterName !== '諏訪子') return char;

  const categories = getCharacterCategories(char);
  for (const section of Object.values(categories)) {
    if (!section?.rows) continue;
    for (const row of section.rows) {
      if (typeof row['技名'] !== 'string') continue;
      if (row['技名'] in RENAME) {
        row['技名'] = RENAME[row['技名']];
      } else if (row['技名'] === '2A') {
        row['技名'] = '2A(LA)';
      }
    }
  }
  return char;
}
