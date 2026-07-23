#!/usr/bin/env node
/** Split scraped frame lists where digit tokens are concatenated without separators. */

const MAX_FRAME = 350;

function scoreSplit(parts) {
  if (!parts.length) return -Infinity;
  let score = 0;
  for (let i = 1; i < parts.length; i++) {
    const prev = Number(parts[i - 1]);
    const curr = Number(parts[i]);
    const gap = curr - prev;
    if (gap < 0) score -= 50;
    else if (gap === 0) score -= 5;
    else if (gap <= 20) score += 5;
    else score -= gap;
  }
  for (const part of parts) {
    const n = Number(part);
    if (n >= 100 && part.length === 3) score += 8;
    if (n <= 99 && part.length === 2) score += 1;
  }
  for (let i = 0; i < parts.length - 1; i++) {
    if (parts[i] === '10') {
      const merged = Number(`10${parts[i + 1]}`);
      if (merged >= 100 && merged <= 199) score -= 40;
    }
  }
  return score;
}

export function splitConcatenatedDigits(s) {
  const token = String(s).trim();
  if (!/^\d+$/.test(token) || token.length < 4) return token;

  const n = token.length;
  let best = null;
  let bestScore = -Infinity;

  function dfs(index, parts) {
    if (index === n) {
      const sc = scoreSplit(parts);
      if (sc > bestScore) {
        bestScore = sc;
        best = [...parts];
      }
      return;
    }
    for (const len of [3, 2]) {
      if (index + len > n) continue;
      const part = token.slice(index, index + len);
      const num = Number(part);
      if (Number.isNaN(num) || num > MAX_FRAME) continue;
      if (len === 3 && num < 100) continue;
      parts.push(part);
      dfs(index + len, parts);
      parts.pop();
    }
  }

  dfs(0, []);
  if (best) return best.join(',');

  const fallback = [];
  for (let i = 0; i < token.length; i += 2) {
    fallback.push(token.slice(i, i + 2));
  }
  return fallback.join(',');
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
