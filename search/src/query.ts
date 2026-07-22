import type { Condition, IndexRow } from './types';
import { formatMatchedAdvantage, type AdvantageKey } from './i18n';

export function getStat(row: IndexRow, path: string): unknown {
  if (path === '技名') return row.stateName ? row.moveName : row.moveName;
  if (path === '状態') return row.stateName;
  if (path === 'コマンド') return row.command;
  if (path === 'Lv') return row.lv;
  if (path === 'キャラ') return row.character;
  if (path === 'カテゴリ') return row.category;
  if (path === '動作.発生') return (row.stats['動作'] as Record<string, string> | undefined)?.['発生'];
  if (path === '動作.全体') return (row.stats['動作'] as Record<string, string> | undefined)?.['全体'];
  if (path === '動作.持続') return (row.stats['動作'] as Record<string, string> | undefined)?.['持続'];
  if (path === '動作.暗転') return (row.stats['動作'] as Record<string, string> | undefined)?.['暗転'];
  if (path === 'キャンセル.上位') return (row.stats['キャンセル'] as Record<string, string> | undefined)?.['上位'];
  if (path === 'キャンセル.移動') return (row.stats['キャンセル'] as Record<string, string> | undefined)?.['移動'];
  if (path === '受身不能') return row.stats['受身不能'];
  if (path === '攻撃Lv') return row.stats['攻撃Lv'];
  if (path === '攻撃分類') return row.stats['攻撃分類'];
  if (path === '備考') return row.stats['備考'];
  if (path.startsWith('有利差.')) {
    const key = path.slice('有利差.'.length);
    return row.parsed.advantage.raws[key] ?? null;
  }
  return row.stats[path];
}

export function getNumeric(row: IndexRow, path: string): number | null {
  if (path === '動作.発生') return row.parsed.startup;
  if (path === '動作.全体') return row.parsed.total;
  if (path === '動作.持続') return row.parsed.active;
  if (path === '動作.暗転') return row.parsed.blackout;
  if (path === 'キャンセル.上位') return row.parsed.cancelUpper;
  if (path === 'キャンセル.移動') return row.parsed.cancelMove;
  if (path === '有利差.min') return row.parsed.advantage.min;
  if (path === '有利差.max') return row.parsed.advantage.max;
  if (path.startsWith('有利差.')) {
    const key = path.slice('有利差.'.length) as keyof typeof row.parsed.advantage;
    const v = row.parsed.advantage[key];
    return typeof v === 'number' ? v : null;
  }
  const raw = getStat(row, path);
  if (raw == null) return null;
  const n = Number(String(raw).replace(/^\+/, ''));
  return Number.isFinite(n) ? n : null;
}

function matchCondition(row: IndexRow, cond: Condition): boolean {
  const { field, op, value } = cond;
  const strVal = String(getStat(row, field) ?? '');
  const numVal = getNumeric(row, field);

  if (field === '有利差.*') {
    const adv = row.parsed.advantage;
    const nums = [adv.seig, adv.goG, adv.tsujo, adv.ch, adv.min].filter(
      (v): v is number => v != null,
    );
    const threshold = Number(value);
    if (!Number.isFinite(threshold)) return false;
    if (op === '<=') return nums.some((n) => n <= threshold);
    if (op === '>=') return nums.some((n) => n >= threshold);
    if (op === '=') return nums.some((n) => n === threshold);
    if (op === '!=') return nums.every((n) => n !== threshold);
    return false;
  }

  if (op === 'contains') return strVal.includes(value);
  if (op === 'matches') {
    try {
      return new RegExp(value).test(strVal);
    } catch {
      return false;
    }
  }

  const threshold = Number(value);
  if (op === '<=' || op === '>=' || op === '=' || op === '!=') {
    if (numVal != null && Number.isFinite(threshold)) {
      if (op === '<=') return numVal <= threshold;
      if (op === '>=') return numVal >= threshold;
      if (op === '=') return numVal === threshold;
      if (op === '!=') return numVal !== threshold;
    }
    if (op === '=') return strVal === value;
    if (op === '!=') return strVal !== value;
    return false;
  }
  return false;
}

export function applyConditions(rows: IndexRow[], conditions: Condition[]): IndexRow[] {
  if (!conditions.length) return rows;
  return rows.filter((row) => conditions.every((c) => matchCondition(row, c)));
}

export function advantagePresetCondition(threshold: number): Condition {
  return { field: '有利差.*', op: '<=', value: String(threshold) };
}

export function matchedAdvantageLabel(row: IndexRow, threshold?: number): string {
  const adv = row.parsed.advantage;
  const parts: { key: AdvantageKey; raw: string }[] = [];
  const entries: [AdvantageKey, number | null][] = [
    ['正G', adv.seig],
    ['誤G', adv.goG],
    ['通常', adv.tsujo],
    ['CH', adv.ch],
  ];
  for (const [key, num] of entries) {
    const raw = adv.raws[key];
    if (raw == null) continue;
    if (threshold != null && num != null && num <= threshold) {
      parts.push({ key, raw });
    } else if (threshold == null) {
      parts.push({ key, raw });
    }
  }
  return formatMatchedAdvantage(parts);
}

export function filterByMoveName(
  rows: IndexRow[],
  moveName: string,
  partial: boolean,
): IndexRow[] {
  const q = moveName.trim();
  if (!q) return rows;

  const fullName = (r: IndexRow) =>
    r.stateName ? `${r.moveName}-${r.stateName}` : r.moveName;

  if (partial) {
    return rows.filter(
      (r) =>
        r.moveName.includes(q) ||
        fullName(r).includes(q) ||
        (r.stateName?.includes(q) ?? false),
    );
  }

  return rows.filter((r) => {
    if (fullName(r) === q) return true;
    if (!r.stateName && r.moveName === q) return true;
    if (r.stateName && r.moveName === q) return true;
    return false;
  });
}
