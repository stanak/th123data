#!/usr/bin/env node
import { getCategorySection } from './character_frame.mjs';
/** Merge 射撃技 summary rows (攻撃Lv/攻撃分類 only) into matching frame-data rows. */

const EXTRA_SUFFIXES = ['弾頭', '爆発', '分裂前', '分裂後', '前半', '後半', '大岩', '小岩'];

export function isBulletSummaryRow(row) {
  const hasMotion = row['動作'] && Object.keys(row['動作']).length > 0;
  const hasCancel = row['キャンセル'];
  const hasAdv = row['有利差'];
  return (row['攻撃Lv'] != null || row['攻撃分類'] != null) && !hasMotion && !hasCancel && !hasAdv;
}

export function needsBulletAttackInfo(row) {
  if (isBulletSummaryRow(row)) return false;
  const hasMotion = row['動作'] && Object.keys(row['動作']).length > 0;
  const hasCancel = row['キャンセル'];
  if (!hasMotion && !hasCancel) return false;
  return row['攻撃Lv'] == null && row['攻撃分類'] == null;
}

function hasExtraSuffix(name) {
  return EXTRA_SUFFIXES.some((s) => name.includes(s));
}

function detailHasSuffix(detailName, suffix) {
  switch (suffix) {
    case '前半部分':
    case '前半3ヒット':
    case '前半5ヒット':
    case '前半':
      return detailName.includes('前半');
    case '後半部分':
    case '後半3ヒット':
    case '後半':
      return detailName.includes('後半');
    default:
      return detailName.includes(suffix);
  }
}

function isHoldDetailName(name) {
  return (
    name.startsWith('ホールド') ||
    (name.startsWith('H') && name !== 'H2B' && /^H[^o-]/.test(name))
  );
}

function parseHoldSummary(summaryName) {
  if (!summaryName.startsWith('ホールド版')) return null;
  return summaryName.slice('ホールド版'.length);
}

function buildContext(summaries) {
  const names = summaries.map((s) => s['技名']);
  const set = new Set(names);
  return {
    names,
    set,
    hasHoldC: names.some((n) => n.startsWith('ホールド版C系射撃')),
    hasHold6B: names.some((n) => n.startsWith('ホールド版6B系射撃')),
    hasHold6C: names.some((n) => n.startsWith('ホールド版6C系射撃')),
    hasHoldJ2C: names.some((n) => n.startsWith('ホールド版J2C系射撃')),
  };
}

function matchBGroup(num, detailName, ctx, { suffix = null, holdOnly = false, nonHoldOnly = false } = {}) {
  const prefixes = num
    ? [`${num}B系-`, `ホールド${num}B系-`, `ホールド${num}B系（`]
    : ['B系-', 'ホールドB系-'];
  const okPrefix = prefixes.some((p) => detailName.startsWith(p));
  if (!okPrefix) return false;
  if (holdOnly && !isHoldDetailName(detailName)) return false;
  if (nonHoldOnly && isHoldDetailName(detailName)) return false;
  if (suffix && !detailHasSuffix(detailName, suffix)) return false;
  if (!suffix && hasExtraSuffix(detailName)) return false;
  return true;
}

function matchCGroup(num, detailName, ctx, { suffix = null, allowHoldFallback = true } = {}) {
  if (!num && (detailName === '立C' || detailName === 'H立C')) {
    return suffix ? detailHasSuffix(detailName, suffix) : true;
  }

  const plainPrefix = `${num}C系-`;
  const holdPrefix = `ホールド${num}C系-`;

  if (detailName.startsWith(plainPrefix) && !isHoldDetailName(detailName)) {
    if (suffix && !detailHasSuffix(detailName, suffix)) return false;
    if (!suffix && hasExtraSuffix(detailName)) return false;
    return true;
  }

  const holdPatterns = num
    ? [holdPrefix, `ホールド${num}C系（`, num === '6' ? 'ホールド6C系-' : null]
    : ['ホールドC系-'];

  if (allowHoldFallback && (!num || num === '6')) {
    const allowHold = num === '6' ? true : !ctx.hasHoldC;
    if (allowHold && holdPatterns.filter(Boolean).some((p) => detailName.startsWith(p))) {
      if (suffix && !detailHasSuffix(detailName, suffix)) return false;
      if (!suffix && hasExtraSuffix(detailName)) return false;
      return true;
    }
  }

  if (num === '6' && (detailName === '6C' || detailName === 'H6C')) {
    return !suffix || detailHasSuffix(detailName, suffix);
  }

  return false;
}

/** @returns {boolean} */
export function matchesBulletSummary(summaryName, detailName, ctx) {
  if (summaryName === detailName) return true;

  if (summaryName === '2B') return detailName === '2B' || detailName === 'H2B';
  if (summaryName === '2C') return detailName === '2C';
  if (summaryName === 'J2C') return detailName === 'J2C' || detailName.startsWith('J2C-');
  if (summaryName === 'J6C') return detailName === 'J6C';
  if (summaryName === '2C-壺') return detailName === '2C-壷' || detailName === '2C-壺';
  if (summaryName === '2C-爆発') return detailName === '2C-爆発';

  const holdBase = parseHoldSummary(summaryName);
  const base = holdBase ?? summaryName;

  const split = base.split('-');
  const root = split[0];
  const suffix = split.length > 1 ? split.slice(1).join('-') : null;

  if (holdBase != null) {
    if (!isHoldDetailName(detailName)) return false;

    if (root === '6C系射撃' && (suffix === '大岩' || suffix === '小岩')) {
      return detailName === 'H6C';
    }

    if (root.match(/^\d*B系射撃(?:-(.+))?$/)) {
      const m = root.match(/^(\d*)B系射撃(?:-(.+))?$/);
      const num = m[1];
      const sfx = m[2] ?? suffix;
      if (sfx?.includes('前半') || sfx?.includes('後半')) {
        return matchBGroup(num, detailName, ctx, { holdOnly: true });
      }
      if (sfx && !detailHasSuffix(detailName, sfx)) return false;
      return matchBGroup(num, detailName, ctx, { holdOnly: true, suffix: sfx ?? undefined });
    }

    if (root.match(/^\d*C系射撃(?:-(.+))?$/)) {
      const m = root.match(/^(\d*)C系射撃(?:-(.+))?$/);
      const num = m[1];
      const sfx = m[2] ?? suffix;
      const holdPrefixes = num
        ? [`ホールド${num}C系-`]
        : ['ホールドC系-'];
      if (!holdPrefixes.some((p) => detailName.startsWith(p))) return false;
      if (sfx && !detailHasSuffix(detailName, sfx)) return false;
      return true;
    }

    return false;
  }

  // C系射撃-{suffix}
  const cSuffix = base.match(/^C系射撃-(.+)$/);
  if (cSuffix) {
    if (detailHasSuffix(detailName, cSuffix[1])) {
      if (detailName.startsWith('C系-')) return true;
      if (detailName.startsWith('ホールドC系-')) return true;
    }
    return false;
  }

  if (base === 'C系射撃') {
    return matchCGroup('', detailName, ctx, { allowHoldFallback: !ctx.hasHoldC });
  }

  if (base === '6C系射撃') {
    return matchCGroup('6', detailName, ctx, { allowHoldFallback: !ctx.hasHold6C });
  }

  const bRoot = base.match(/^(\d*)B系射撃(?:-(.+))?$/);
  if (bRoot) {
    const num = bRoot[1];
    const sfx = bRoot[2] ?? null;
    if (sfx === '前半3ヒット' || sfx === '後半3ヒット') {
      return matchBGroup(num, detailName, ctx, { nonHoldOnly: true });
    }
    if (sfx === '弾頭' || sfx === '爆発') {
      return matchBGroup(num, detailName, ctx, { suffix: sfx });
    }
    if (sfx === '親弾' || sfx === '子弾') {
      return matchBGroup(num, detailName, ctx, { nonHoldOnly: true });
    }
    return matchBGroup(num, detailName, ctx, {});
  }

  const cRoot = base.match(/^(\d*)C系射撃(?:-(.+))?$/);
  if (cRoot) {
    const num = cRoot[1];
    const sfx = cRoot[2] ?? null;
    return matchCGroup(num, detailName, ctx, {
      suffix: sfx,
      allowHoldFallback: num === '6' ? !ctx.hasHold6C : !ctx.hasHoldC,
    });
  }

  if (base === 'J2C系射撃' || base.startsWith('J2C系射撃-')) {
    const sfx = base === 'J2C系射撃' ? null : base.slice('J2C系射撃-'.length);
    const patterns = ['J2C系-', 'J2C-', 'ホールドJ2C系-'];
    if (!patterns.some((p) => detailName.startsWith(p) || detailName.startsWith('J2C'))) return false;
    if (sfx === '親弾' || sfx === '子弾') return detailHasSuffix(detailName, sfx);
    return detailName.startsWith('J2C') && (!sfx || detailHasSuffix(detailName, sfx));
  }

  if (base === 'J6C系射撃') {
    return detailName === 'J6C' || detailName.startsWith('J6C');
  }

  if (base.startsWith('2C系-')) {
    return detailName === base || detailName.endsWith(base.slice('2C系-'.length));
  }

  if (base.endsWith('系射撃')) {
    const stem = base.replace(/系射撃$/, '系');
    return detailName.startsWith(`${stem}-`);
  }

  return false;
}

function summarySpecificity(name) {
  let score = name.length * 2;
  if (name.includes('-')) score += 200;
  if (name.startsWith('ホールド版')) score += 100;
  return score;
}

function applyAttackInfo(target, source) {
  if (source['攻撃Lv'] != null) target['攻撃Lv'] = source['攻撃Lv'];
  if (source['攻撃分類'] != null) target['攻撃分類'] = source['攻撃分類'];
}

export function mergeBulletSummaries(rows) {
  if (!Array.isArray(rows) || !rows.length) return rows;

  const summaries = rows.filter(isBulletSummaryRow);
  if (!summaries.length) return rows;

  const ctx = buildContext(summaries);
  const sortedSummaries = [...summaries].sort(
    (a, b) => summarySpecificity(b['技名']) - summarySpecificity(a['技名']),
  );

  const assigned = new Set();
  for (const summary of sortedSummaries) {
    const summaryName = summary['技名'];
    for (let i = 0; i < rows.length; i++) {
      if (assigned.has(i)) continue;
      const row = rows[i];
      const detailName = row['技名'];
      if (!detailName) continue;
      if (isBulletSummaryRow(row) && detailName !== summaryName) continue;
      if (!needsBulletAttackInfo(row) && detailName !== summaryName) continue;
      if (!matchesBulletSummary(summaryName, detailName, ctx)) continue;
      applyAttackInfo(row, summary);
      assigned.add(i);
    }
  }

  return rows.filter((row) => !isBulletSummaryRow(row));
}

export function mergeCharacterBulletSummaries(char) {
  const section = getCategorySection(char, '射撃技');
  if (!section?.rows) return char;
  section.rows = mergeBulletSummaries(section.rows);
  return char;
}
