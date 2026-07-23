/** Wiki 射撃技早見表の入力表記 → frame_data 技名 */

import { normalizeMoveName } from './normalize_move.mjs';

const SUB_ALIASES = {
  前半部分: ['前半分', '前半'],
  後半部分: ['後半'],
  立A: ['A', '近A'],
  立B: ['B'],
  立C: ['C'],
  JpA: ['JA'],
  JpB: ['JB'],
  JpC: ['JC'],
  A攻撃: ['A'],
  '+A攻撃': ['6A'],
  '+A攻撃系': ['2A', '8A'],
  B攻撃: ['B'],
  C攻撃: ['C'],
  始動攻撃: ['始動'],
};

/** Wiki 早見表の説明付き入力名 → frame_data 技名 */
const WIKI_INPUT_ALIASES = {
  ダッシュB: 'DB',
  A攻撃: 'A',
  '+A攻撃': '6A',
  '+A攻撃系': ['2A', '8A'],
  B攻撃: 'B',
  C攻撃: 'C',
  始動攻撃: '始動',
};

/** Wiki 早見表のグループ名 → frame_data 技名 */
const WIKI_GROUP_ALIASES = {
  物質と反物質の境界: '物質と反物質の宇宙',
};

function wikiInputAliasKey(input) {
  return String(input ?? '').replace(/\s+/g, '').trim();
}

function wikiInputAliasTargets(input) {
  const hit = WIKI_INPUT_ALIASES[wikiInputAliasKey(input)];
  if (!hit) return null;
  return Array.isArray(hit) ? hit : [hit];
}

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

  const aliasTargets = wikiInputAliasTargets(s);
  if (aliasTargets) return normalizeMoveName(aliasTargets[0]);

  if (/^ホールド版・Jp\+A|^ホールド版・J\+A/.test(s.replace(/\s+/g, ''))) return 'HJ2A';

  if (s === 'Jp+B') return 'J2B';
  if (s === 'Jp+A') return 'J2A';
  if (s === 'Jp+C') {
    return /\+C系|[（(]\+C/.test(groupContext) ? 'J6C' : 'J2C';
  }
  if (s === 'ダッシュB') return 'DB';

  let hold = false;
  if (s.startsWith('ホールド')) {
    hold = true;
    s = s.slice('ホールド'.length);
  }

  if (s === 'Jp+A') return hold ? 'HJ2A' : 'J2A';
  if (s === 'Jp+B') return hold ? 'HJ2B' : 'J2B';

  if (/^\+([ABC])$/i.test(s)) s = `6${s.slice(1)}`;
  s = s.replace(/Jp/g, 'J');
  s = s.replace(/(\d)\+([ABC])/gi, '$1$2');

  if (/^屈(?=[\dABC])/i.test(s)) s = `2${s.slice(1)}`;
  else if (/^立(?=[ABC])/i.test(s)) s = s.slice(1);

  if (hold) s = `H${s}`;

  return normalizeMoveName(s);
}

export function resolveWikiBulletTargets(input, groupContext = '') {
  const aliasTargets = wikiInputAliasTargets(input);
  if (aliasTargets) {
    return [...new Set(aliasTargets.map((name) => normalizeMoveName(name)))];
  }

  const direct = normalizeWikiBulletInput(input, groupContext);
  if (!direct) return [];

  const targets = new Set([direct]);
  if (direct === 'A' && wikiInputAliasKey(input) === '立A') {
    targets.add('近A');
  }
  for (const alias of SUB_ALIASES[input] ?? []) {
    targets.add(normalizeMoveName(alias));
  }
  return [...targets];
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
      for (const name of resolveWikiBulletTargets(input, group)) targets.add(name);
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
      for (const name of resolveWikiBulletTargets(input, group)) {
        if (/系射撃/.test(group) && (sub === '前半部分' || sub === '後半部分')) {
          targets.add(name);
        }
      }
    }
    if (targets.size) return [...targets];
  }

  for (const name of resolveWikiBulletTargets(sub, group)) targets.add(name);
  const groupDirect = normalizeWikiBulletInput(group, group);
  if (groupDirect) targets.add(groupDirect);

  if (group && group !== sub && !/系射撃/.test(group)) {
    const compact = group.replace(/\s+/g, '');
    targets.add(compact);
    const alias = WIKI_GROUP_ALIASES[compact];
    if (alias) targets.add(alias);
  }
  if (sub && sub !== group) {
    targets.add(sub);
    for (const alias of SUB_ALIASES[sub] ?? []) targets.add(alias);
  }

  return [...new Set([...targets].map((n) => normalizeMoveName(n)))];
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
  for (const target of resolveWikiBulletTargets(wikiSub)) {
    if (normalizeLookupKey(target) === b) return true;
  }
  return false;
}
