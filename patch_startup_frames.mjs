#!/usr/bin/env node
import { getCharacterCategories } from './character_frame.mjs';
/** Apply hand-verified 発生 corrections after normalize_frame_values. */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CORRECTIONS_PATH = path.join(__dirname, 'startup_frame_corrections.json');

let cachedCorrections = null;

export function loadStartupCorrections() {
  if (cachedCorrections) return cachedCorrections;
  const raw = JSON.parse(fs.readFileSync(CORRECTIONS_PATH, 'utf8'));
  cachedCorrections = raw.corrections ?? {};
  return cachedCorrections;
}

export function patchStartupValue(value, corrections = loadStartupCorrections()) {
  if (value == null || typeof value !== 'string') return value;
  return corrections[value] ?? value;
}

function patchRowStartup(row, corrections) {
  const motion = row['動作'];
  if (motion && typeof motion['発生'] === 'string') {
    motion['発生'] = patchStartupValue(motion['発生'], corrections);
  }
  if (Array.isArray(row['状態'])) {
    for (const state of row['状態']) patchRowStartup(state, corrections);
  }
  const lvTree = row['Lv'];
  if (lvTree && typeof lvTree === 'object' && !Array.isArray(lvTree)) {
    patchNestedStartup(lvTree, corrections);
  }
}

export function patchNestedStartup(lvTree, corrections = loadStartupCorrections()) {
  for (const cmdTree of Object.values(lvTree)) {
    if (!cmdTree || typeof cmdTree !== 'object') continue;
    for (const bucketNode of Object.values(cmdTree)) {
      if (!bucketNode || typeof bucketNode !== 'object') continue;
      if (bucketNode['_']?.['動作']) {
        patchRowStartup(bucketNode['_'], corrections);
      }
      for (const stats of Object.values(bucketNode)) {
        if (stats?.['動作']) patchRowStartup(stats, corrections);
      }
    }
  }
}

export function patchCharacterStartupFrames(char, corrections = loadStartupCorrections()) {
  const categories = getCharacterCategories(char);

  for (const section of Object.values(categories)) {
    if (!section?.rows) continue;
    for (const row of section.rows) patchRowStartup(row, corrections);
  }
  return char;
}
