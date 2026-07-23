/** Wiki 射撃技早見表の入力表記 → frame_data 技名 */

import { normalizeMoveName } from './normalize_move.mjs';

const SUB_ALIASES = {
  前半部分: ['前半分', '前半'],
  後半部分: ['後半'],
};

export function joinCellLines(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .join('。');
}

export function normalizeWikiBulletInput(input, groupContext = '') {
  let s = String(input ?? '')
    .replace(/\u3000/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\(\*\d+\)/g, '')
    .trim();
  if (!s || s === '-') return null;

  if (s === 'Jp+B') return 'J2B';
  if (s === 'Jp+C') {
    return /\+C系|[（(]\+C/.test(groupContext) ? 'J6C' : 'J2C';
  }

  let hold = false;
  if (s.startsWith('ホールド')) {
    hold = true;
    s = s.slice('ホールド'.length);
  }

  if (/^\+([BC])$/i.test(s)) s = `6${s.slice(1)}`;
  s = s.replace(/Jp/g, 'J');
  s = s.replace(/(\d)\+([ABC])/gi, '$1$2');

  if (/^屈(?=[\dBC])/i.test(s)) s = `2${s.slice(1)}`;
  else if (/^立(?=[BC])/i.test(s)) s = s.slice(1);

  if (hold) s = `H${s}`;

  return normalizeMoveName(s);
}

export function extractGroupInputs(groupName) {
  const m = String(groupName ?? '').match(/[（(]([^）)]+)[）)]/);
  if (!m) return [];
  return m[1]
    .split(/[、,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function normalizeGroupLabel(text) {
  return String(text ?? '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
}

export function expandWikiBulletTargets(groupName, subName) {
  const group = normalizeGroupLabel(groupName);
  const sub = normalizeGroupLabel(subName);
  const targets = new Set();

  const inputs = extractGroupInputs(groupName);
  const isGroupRow = !sub || sub === group || inputs.some((input) => normalizeGroupLabel(input) === sub);

  if (inputs.length && isGroupRow) {
    for (const input of inputs) {
      const name = normalizeWikiBulletInput(input, group);
      if (name) targets.add(name);
    }
    if (!/ホールド/.test(group)) {
      for (const name of [...targets]) {
        if (!name.startsWith('H')) targets.add(`H${name}`);
      }
    }
    return [...targets];
  }

  if (inputs.length) {
    for (const input of inputs) {
      const name = normalizeWikiBulletInput(input, group);
      if (!name) continue;
      if (/系射撃/.test(group) && (sub === '前半部分' || sub === '後半部分')) {
        targets.add(name);
      }
    }
    if (targets.size) return [...targets];
  }

  const direct = normalizeWikiBulletInput(sub, group) ?? normalizeWikiBulletInput(group, group);
  if (direct) targets.add(direct);
  if (group && group !== sub && !/系射撃/.test(group)) {
    targets.add(group.replace(/\s+/g, ''));
  }
  if (sub && sub !== group) {
    targets.add(sub);
    for (const alias of SUB_ALIASES[sub] ?? []) targets.add(alias);
  }

  return [...targets].map((n) => normalizeMoveName(n));
}

export function normalizeLookupKey(name) {
  return String(name ?? '')
    .replace(/\u3000/g, ' ')
    .replace(/\s+/g, '')
    .replace(/\(\*\d+\)/g, '')
    .trim();
}

export function subNameMatches(wikiSub, rowName) {
  const a = normalizeLookupKey(wikiSub);
  const b = normalizeLookupKey(rowName);
  if (!a || !b) return false;
  if (a === b) return true;
  for (const alias of SUB_ALIASES[wikiSub] ?? []) {
    if (normalizeLookupKey(alias) === b) return true;
  }
  return false;
}
