#!/usr/bin/env node
/** Merge 攻撃Lv/攻撃分類-only stub rows into same-name frame-data rows. */

import { isNestedMoveRow } from './lv_utils.mjs';

const SKIP_CATEGORIES = new Set(['射撃技']);

export function isAttackInfoStub(row) {
  if (isNestedMoveRow(row)) return false;
  const hasMotion = row['動作'] && Object.keys(row['動作']).length > 0;
  const hasCancel = row['キャンセル'];
  const hasAdv = row['有利差'];
  const hasStates = Array.isArray(row['状態']) && row['状態'].length > 0;
  return (
    (row['攻撃Lv'] != null || row['攻撃分類'] != null) &&
    !hasMotion &&
    !hasCancel &&
    !hasAdv &&
    !hasStates
  );
}

export function hasFrameData(row) {
  const hasMotion = row['動作'] && Object.keys(row['動作']).length > 0;
  return hasMotion || row['キャンセル'] || row['有利差'] || (Array.isArray(row['状態']) && row['状態'].length > 0);
}

export function needsAttackInfo(row) {
  if (isAttackInfoStub(row)) return false;
  if (!hasFrameData(row)) return false;
  return row['攻撃Lv'] == null && row['攻撃分類'] == null;
}

function normalizeLvString(lv) {
  return typeof lv === 'string' ? lv.replace(/～/g, '~') : lv;
}

export function parseLvLevels(lv) {
  const normalized = normalizeLvString(lv);
  if (normalized == null || normalized === '') return null;
  if (normalized.includes('~')) {
    const [start, end] = normalized.split('~').map(Number);
    if (Number.isNaN(start) || Number.isNaN(end)) return [normalized];
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }
  const n = Number(normalized);
  return Number.isNaN(n) ? [normalized] : [n];
}

export function lvOverlaps(stubLv, detailLv) {
  const a = normalizeLvString(stubLv);
  const b = normalizeLvString(detailLv);
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  const sa = parseLvLevels(a);
  const sb = parseLvLevels(b);
  if (typeof sa[0] === 'number' && typeof sb[0] === 'number') {
    return sa.some((level) => sb.includes(level));
  }
  return a === b;
}

export function commandsMatch(stubCmd, detailCmd) {
  if (stubCmd == null || stubCmd === '') return true;
  if (detailCmd == null) return false;
  if (detailCmd === stubCmd) return true;

  const stubBase = String(stubCmd).match(/^(\d+)/)?.[1];
  const detailBase = String(detailCmd).match(/^(\d+)/)?.[1];
  if (stubBase && stubBase === detailBase && String(stubCmd) === stubBase) {
    return true;
  }
  return false;
}

export function matchesAttackInfoStub(stub, detail) {
  if (!stub['技名'] || stub['技名'] !== detail['技名']) return false;
  if (!hasFrameData(detail)) return false;
  if (!lvOverlaps(stub['Lv'], detail['Lv'])) return false;
  return commandsMatch(stub['コマンド'], detail['コマンド']);
}

function applyAttackInfo(target, source) {
  if (source['攻撃Lv'] != null) target['攻撃Lv'] = source['攻撃Lv'];
  if (source['攻撃分類'] != null) target['攻撃分類'] = source['攻撃分類'];
}

export function mergeMoveAttackStubs(rows) {
  if (!Array.isArray(rows) || !rows.length) return rows;

  const stubs = rows.filter(isAttackInfoStub);
  if (!stubs.length) return rows;

  const mergedStubIndices = new Set();
  for (let stubIndex = 0; stubIndex < rows.length; stubIndex++) {
    const stub = rows[stubIndex];
    if (!isAttackInfoStub(stub)) continue;

    let matched = false;
    for (let detailIndex = 0; detailIndex < rows.length; detailIndex++) {
      if (detailIndex === stubIndex) continue;
      const detail = rows[detailIndex];
      if (!matchesAttackInfoStub(stub, detail)) continue;
      applyAttackInfo(detail, stub);
      matched = true;
    }

    if (matched) mergedStubIndices.add(stubIndex);
  }

  return rows.filter((_, index) => !mergedStubIndices.has(index));
}

export function mergeCharacterMoveAttackStubs(char) {
  const frame = char.frameData?.['フレームデータ'];
  if (!frame) return char;

  for (const [category, section] of Object.entries(frame)) {
    if (SKIP_CATEGORIES.has(category) || !section?.rows) continue;
    section.rows = mergeMoveAttackStubs(section.rows);
  }
  return char;
}
