#!/usr/bin/env node
/** Classify move variant labels into 段 / 位置 / 状態 buckets. */

export const VARIANT_BUCKETS = ['段', '位置', '状態'];

export const POSITION_LABELS = new Set(['地上', '空中', '地中', '立ち', 'しゃがみ', '立ちしゃがみ']);

export function normalizePositionLabel(label) {
  if (label == null) return null;
  const s = String(label);
  if (s === '地上版' || s === '地上') return '地上';
  if (s === '空中版' || s === '空中') return '空中';
  if (s === '地中版' || s === '地中') return '地中';
  if (s === '立ち版' || s === '立ち') return '立ち';
  if (s === 'しゃがみ版' || s === 'しゃがみ') return 'しゃがみ';
  if (s === '立ちしゃがみ') return '立ちしゃがみ';
  return s;
}

export function isPositionLabel(label) {
  return POSITION_LABELS.has(normalizePositionLabel(label));
}

/** @returns {{ bucket: '段'|'位置'|'状態', key: string } | null} */
export function classifyVariantLabel(label) {
  if (label == null || label === '_' || label === '') return null;
  const s = String(label);
  const dan = s.match(/^(\d+)段目$/);
  if (dan) return { bucket: '段', key: dan[1] };
  const pos = normalizePositionLabel(s);
  if (POSITION_LABELS.has(pos)) return { bucket: '位置', key: pos };
  return { bucket: '状態', key: s };
}

export function formatSegmentDisplay(key) {
  if (key == null || key === '') return '';
  return /^\d+$/.test(String(key)) ? `${key}段目` : String(key);
}

export function isVariantBucketNode(node) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return false;
  return VARIANT_BUCKETS.some((bucket) => bucket in node) || ('_' in node && VARIANT_BUCKETS.every((b) => !(b in node)));
}

export function segmentSortKey(segment) {
  if (segment == null || segment === '') return -1;
  const n = Number(segment);
  return Number.isNaN(n) ? String(segment) : n;
}

export function positionSortKey(position) {
  const order = ['地上', '立ち', 'しゃがみ', '立ちしゃがみ', '空中', '地中'];
  if (position == null) return -1;
  const idx = order.indexOf(position);
  return idx >= 0 ? idx : 100;
}
