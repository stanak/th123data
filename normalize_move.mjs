/** Shared move-name normalization rules. */

export function joinCellLines(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .join('。');
}

/** B系- / ホールドC系- などの系統プレフィックス */
const SERIES_PREFIX = /^(?:ホールド)?(?:J2C|\d+[BC]|[BC])系-/;

/** BR で区切られた複数技名、または旧スクレイプの連結名を分割 */
export function splitConcatenatedMoveName(name) {
  if (!name || typeof name !== 'string') return [name];
  if (name.includes('\n')) {
    return name.split('\n').map((s) => s.trim()).filter(Boolean);
  }
  const patterns = [
    /^((?:近|遠)(?:屈)?A)(\d*[ABC].*)$/,
    /^(近屈A)(\d*[ABC].*)$/,
    /^(遠屈A)(\d*[ABC].*)$/,
  ];
  for (const re of patterns) {
    const m = name.match(re);
    if (m?.[2]) return [m[1], m[2]];
  }
  return [name];
}

function splitMultilineMoveNameObject(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const keys = splitConcatenatedMoveName(k);
    const vals = typeof v === 'string' ? splitConcatenatedMoveName(v) : [v];
    keys.forEach((key, i) => {
      out[normalizeMoveName(key)] = typeof v === 'string'
        ? normalizeMoveName(vals[Math.min(i, vals.length - 1)])
        : normalizeMoveNameField(v);
    });
  }
  return out;
}

export function joinMultilineFields(obj) {
  if (!obj || typeof obj !== 'object') return;
  for (const [k, v] of Object.entries(obj)) {
    if (k === '技名') continue;
    if (typeof v === 'string') obj[k] = joinCellLines(v);
    else if (v && typeof v === 'object') joinMultilineFields(v);
  }
}

/** 技名セルの改行・連結を別エントリに展開 */
export function splitMultilineMoveRows(rows) {
  if (!Array.isArray(rows)) return rows;
  const out = [];
  for (const row of rows) {
    if (row?.技名 != null && typeof row.技名 === 'object' && !Array.isArray(row.技名)) {
      joinMultilineFields(row);
      row.技名 = splitMultilineMoveNameObject(row.技名);
      out.push(row);
      continue;
    }
    const names = typeof row?.技名 === 'string'
      ? splitConcatenatedMoveName(row.技名)
      : [row?.技名];
    if (names.length <= 1) {
      if (typeof row?.技名 === 'string') row.技名 = names[0];
      joinMultilineFields(row);
      out.push(row);
      continue;
    }
    for (const n of names) {
      const copy = { ...row };
      copy.技名 = n;
      joinMultilineFields(copy);
      out.push(copy);
    }
  }
  return out;
}

export function normalizeMoveName(name) {
  if (!name || typeof name !== 'string') return name;
  if (/^屈(?=[A-Za-z])/.test(name)) return normalizeMoveName('2' + name.slice(1));
  if (/^H屈(?=[A-Za-z])/.test(name)) return normalizeMoveName('H2' + name.slice(2));
  name = name.replace(/Dh(?=[ABC])/g, 'D');
  name = name.replace(/(\d)\+([ABC])/g, '$1$2');
  name = name.replace(/Jp/g, 'J');
  name = name.replace(SERIES_PREFIX, '');
  name = name.replace(/立(?=[A-Z0-9])/g, '');
  return name;
}

function normalizeMoveNameField(value) {
  if (typeof value === 'string') return normalizeMoveName(value);
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[normalizeMoveName(k)] = normalizeMoveNameField(v);
    }
    return out;
  }
  return value;
}

/** Expand consecutive rows sharing "1～n段目" into 1段目, 2段目, ... */
export function expandDanmokuRows(rows) {
  if (!Array.isArray(rows)) return;
  let i = 0;
  while (i < rows.length) {
    const name = rows[i]?.技名;
    if (typeof name !== 'string') {
      i++;
      continue;
    }
    let prefix = null;
    if (/^(.+?)(\d+)～(\d+)段目$/.test(name)) {
      prefix = name.replace(/(\d+)～(\d+)段目$/, '');
    } else if (/^(.+?)(\d+)段目～(\d+)段目$/.test(name)) {
      prefix = name.replace(/(\d+)段目～(\d+)段目$/, '');
    }
    if (!prefix) {
      i++;
      continue;
    }
    let j = i;
    while (j < rows.length && rows[j]?.技名 === name) j++;
    const count = j - i;
    for (let k = 0; k < count; k++) {
      rows[i + k].技名 = `${prefix}${k + 1}段目`;
    }
    i = j;
  }
}

export function resolveDittoRows(rows) {
  if (!Array.isArray(rows)) return;
  resolveDittoRowsImpl(rows);
}

function resolveDittoRowsImpl(rows) {
  let prevRow = null;
  for (const row of rows) {
    if (prevRow) resolveDittoInRow(row, prevRow);
    if (Array.isArray(row?.['状態'])) {
      let prevState = null;
      for (const state of row['状態']) {
        const prevNamed = prevRow?.['状態']?.find((s) => s['技名'] === state['技名']);
        resolveDittoInRow(state, prevNamed ?? prevState ?? prevRow);
        prevState = state;
      }
    }
    prevRow = row;
  }
}

function resolveDittoInRow(row, prevRow) {
  for (const k of Object.keys(row)) {
    if (k === '技名') continue;
    row[k] = resolveDittoValue(row[k], prevRow[k]);
  }
}

function resolveDittoValue(value, prevValue) {
  if (value === '〃') return prevValue !== undefined ? prevValue : value;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const out = {};
    const prevObj = prevValue && typeof prevValue === 'object' ? prevValue : {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = resolveDittoValue(v, prevObj[k]);
    }
    return out;
  }
  return value;
}

export function normalizeTableRows(rows) {
  if (!Array.isArray(rows)) return;
  const expanded = splitMultilineMoveRows(rows);
  rows.splice(0, rows.length, ...expanded);
  for (const row of rows) {
    if (row?.技名 != null) row.技名 = normalizeMoveNameField(row.技名);
  }
  expandDanmokuRows(rows);
  resolveDittoRows(rows);
}

export function walkAndNormalize(node) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node.tables)) {
    for (const table of node.tables) normalizeTableRows(table.rows);
  }
  if (Array.isArray(node)) {
    for (const item of node) walkAndNormalize(item);
    return;
  }
  for (const value of Object.values(node)) {
    if (value && typeof value === 'object') walkAndNormalize(value);
  }
}

function normalizeRowMoveName(row) {
  if (typeof row['技名'] === 'string') {
    row['技名'] = normalizeMoveName(row['技名']);
  }
}

export function normalizeCharacterMoveNames(char) {
  const frame = char.frameData?.['フレームデータ'];
  if (!frame) return char;

  for (const section of Object.values(frame)) {
    if (!section?.rows) continue;
    for (const row of section.rows) {
      normalizeRowMoveName(row);
    }
  }
  return char;
}
