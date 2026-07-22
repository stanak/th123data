#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRAME_DATA = path.join(__dirname, 'frame_data.json');
const OUT = path.join(__dirname, 'search', 'public', 'search_index.json');

const CATEGORIES = ['通常技', '射撃技', '必殺技', 'スペルカード'];

/** @returns {number | null} */
export function parseFrameValue(raw) {
  if (raw == null || raw === '' || raw === '-' || raw === '〃') return null;
  const s = String(raw).trim();
  if (!s || s === 'down' || s.includes('有利') || s.includes('…')) return null;
  const range = s.match(/^([+-]?[\d.]+)(?:\[([+-]?[\d.]+)\])?$/);
  if (range) return Number(range[1]);
  const pm = s.match(/^±(\d+)$/);
  if (pm) return 0;
  const num = s.match(/^([+-]?\d+(?:\.\d+)?)/);
  if (num) return Number(num[1]);
  return null;
}

/** @returns {{ min: number|null, max: number|null, raw: string|null, values: number[] }} */
export function parseAdvantageField(raw) {
  if (raw == null || raw === '' || raw === '-' || raw === '〃') {
    return { min: null, max: null, raw: null, values: [] };
  }
  const s = String(raw).trim();
  if (!s || s === 'down' || s.includes('大幅')) {
    return { min: null, max: null, raw: s, values: [] };
  }
  const range = s.match(/^([+-]?[\d.]+)(?:\[([+-]?[\d.]+)\])?$/);
  if (range) {
    const a = Number(range[1]);
    const b = range[2] != null ? Number(range[2]) : a;
    const min = Math.min(a, b);
    const max = Math.max(a, b);
    return { min, max, raw: s, values: min === max ? [min] : [min, max] };
  }
  const pm = s.match(/^±(\d+)$/);
  if (pm) return { min: 0, max: 0, raw: s, values: [0] };
  const num = parseFrameValue(s);
  if (num != null) return { min: num, max: num, raw: s, values: [num] };
  return { min: null, max: null, raw: s, values: [] };
}

/** @param {Record<string, string>|undefined} adv */
function parseAdvantage(adv) {
  const keys = ['正G', '誤G', '通常', 'CH'];
  const out = { seig: null, goG: null, tsujo: null, ch: null, min: null, max: null, raws: {} };
  if (!adv || typeof adv !== 'object') return out;
  const map = { 正G: 'seig', 誤G: 'goG', 通常: 'tsujo', CH: 'ch' };
  const allValues = [];
  for (const k of keys) {
    const parsed = parseAdvantageField(adv[k]);
    out.raws[k] = parsed.raw;
    if (parsed.min != null) {
      out[map[k]] = parsed.min;
      allValues.push(parsed.min, parsed.max);
    }
  }
  const nums = allValues.filter((v) => v != null);
  if (nums.length) {
    out.min = Math.min(...nums);
    out.max = Math.max(...nums);
  }
  return out;
}

function buildIndex() {
  const data = JSON.parse(fs.readFileSync(FRAME_DATA, 'utf8'));
  const characters = Object.keys(data.characters).sort();
  const footnotes = {};
  const rows = [];
  let id = 0;

  for (const character of characters) {
    const charData = data.characters[character];
    if (charData.footnotes) footnotes[character] = charData.footnotes;
    const sections = charData.frameData?.['フレームデータ'] || {};
    for (const category of CATEGORIES) {
      const section = sections[category];
      if (!section?.rows) continue;
      for (const row of section.rows) {
        const moveName = row['技名'] ?? row['行動の種類'] ?? '';
        const dousa = row['動作'] || {};
        rows.push({
          id: String(id++),
          character,
          category,
          moveName: String(moveName),
          command: row['コマンド'] ?? null,
          lv: row['Lv'] ?? null,
          stats: row,
          parsed: {
            startup: parseFrameValue(dousa['発生']),
            total: parseFrameValue(dousa['全体']),
            active: parseFrameValue(dousa['持続']),
            advantage: parseAdvantage(row['有利差']),
          },
        });
      }
    }
  }

  const index = {
    generatedAt: new Date().toISOString(),
    characterCount: characters.length,
    rowCount: rows.length,
    characters,
    categories: CATEGORIES,
    footnotes,
    rows,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(index), 'utf8');
  console.log(JSON.stringify({ out: OUT, characters: characters.length, rows: rows.length }, null, 2));
}

buildIndex();
