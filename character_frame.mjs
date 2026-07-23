#!/usr/bin/env node
/** Access character frame categories (通常技 / 射撃技 / …) without frameData.フレームデータ nesting. */

export const RESERVED_CHAR_KEYS = new Set([
  'footnotes',
  'frameData',
  'name',
  'pageUrl',
  'title',
  'url',
  'error',
]);

export function isCategorySection(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return (
    'rows' in value ||
    'tables' in value ||
    'subsections' in value ||
    'pages' in value ||
    'notes' in value
  );
}

/** Raw scrape input: legacy frameData.フレームデータ or already-flat categories. */
export function getSourceFrameSections(char) {
  if (char?.frameData?.['フレームデータ']) {
    return char.frameData['フレームデータ'];
  }
  return getCharacterCategories(char);
}

/** Processed character object: category name → { rows, notes? }. */
export function getCharacterCategories(char) {
  const sections = {};
  if (!char || typeof char !== 'object') return sections;
  for (const [key, value] of Object.entries(char)) {
    if (RESERVED_CHAR_KEYS.has(key)) continue;
    if (isCategorySection(value)) sections[key] = value;
  }
  return sections;
}

export function getCategorySection(char, category) {
  return getCharacterCategories(char)[category];
}

export function categoryRows(char, category) {
  return getCategorySection(char, category)?.rows;
}
