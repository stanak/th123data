#!/usr/bin/env node
/** Split scraped frame lists where 4+ digit tokens are concatenated 2-digit values. */

function splitConcatenatedDigits(token) {
  const s = String(token).trim();
  if (!/^\d+$/.test(s) || s.length < 4) return s;

  const parts = [];
  for (let i = 0; i < s.length; i += 2) {
    parts.push(s.slice(i, i + 2));
  }
  return parts.join(',');
}

function expandFrameTokenList(part) {
  return part
    .split(/[、,]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => splitConcatenatedDigits(t))
    .join(',');
}

function normalizeEllipsisFrameValue(raw) {
  const idx = raw.indexOf('…');
  const before = raw.slice(0, idx);
  const after = raw.slice(idx + 1);

  const beforePart = expandFrameTokenList(before);
  if (!after.trim()) {
    return beforePart ? `${beforePart},...` : '...';
  }

  const afterPart = expandFrameTokenList(after);
  return `${beforePart},...,${afterPart}`;
}

export function normalizeFrameListValue(raw) {
  if (raw == null || typeof raw !== 'string') return raw;

  const s = raw.trim();
  if (!s) return raw;
  if (s === 'down' || s === '備考' || s.includes('有利')) return raw;

  if (s.includes('…')) {
    return normalizeEllipsisFrameValue(s);
  }

  if (!/\d{4,}/.test(s)) return raw;

  if (/[、,]/.test(s)) {
    return expandFrameTokenList(s);
  }

  return splitConcatenatedDigits(s);
}

const FRAME_FIELD_GROUPS = [
  ['動作', ['発生', '全体', '持続', '暗転']],
  ['キャンセル', ['上位', '移動']],
];

function normalizeRowFrameValues(row) {
  for (const [group, keys] of FRAME_FIELD_GROUPS) {
    const obj = row[group];
    if (!obj || typeof obj !== 'object') continue;
    for (const key of keys) {
      if (typeof obj[key] === 'string') {
        obj[key] = normalizeFrameListValue(obj[key]);
      }
    }
  }
  return row;
}

export function normalizeCharacterFrameValues(char) {
  const frame = char.frameData?.['フレームデータ'];
  if (!frame) return char;

  for (const section of Object.values(frame)) {
    if (!section?.rows) continue;
    for (const row of section.rows) {
      normalizeRowFrameValues(row);
      if (Array.isArray(row['状態'])) {
        for (const state of row['状態']) normalizeRowFrameValues(state);
      }
    }
  }
  return char;
}
