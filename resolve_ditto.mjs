#!/usr/bin/env node
/** Resolve 〃 (ditto) markers from the previous row or previous matching state. */

export function resolveDittoValue(value, prevValue) {
  if (value === '〃') return prevValue !== undefined ? structuredClone(prevValue) : value;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const out = {};
    const prevObj = prevValue && typeof prevValue === 'object' && !Array.isArray(prevValue) ? prevValue : {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = resolveDittoValue(v, prevObj[k]);
    }
    return out;
  }
  return value;
}

export function resolveDittoInObject(target, reference) {
  if (!target || !reference || typeof target !== 'object') return target;
  for (const key of Object.keys(target)) {
    if (key === '技名' || key === '状態') continue;
    target[key] = resolveDittoValue(target[key], reference[key]);
  }
  return target;
}

function rowContextMatch(a, b) {
  return a['技名'] === b['技名'] && a['コマンド'] === b['コマンド'] && a['Lv'] === b['Lv'];
}

function findNamedState(row, stateName) {
  if (!row || !stateName || !Array.isArray(row['状態'])) return null;
  return row['状態'].find((state) => state['技名'] === stateName) ?? null;
}

function findStateReference(rows, rowIndex, state, prevStateInArray) {
  if (prevStateInArray) return prevStateInArray;

  const row = rows[rowIndex];

  for (let i = rowIndex - 1; i >= 0; i--) {
    const candidate = rows[i];
    if (!rowContextMatch(candidate, row)) continue;
    const named = findNamedState(candidate, state['技名']);
    if (named) return named;
  }

  if (state['技名'] === '空中') {
    for (let i = rowIndex; i >= 0; i--) {
      const candidate = rows[i];
      if (!rowContextMatch(candidate, row)) continue;
      const ground = findNamedState(candidate, '地上');
      if (ground) return ground;
    }
  }

  const prevRow = rows[rowIndex - 1];
  if (prevRow && rowContextMatch(prevRow, row)) {
    if (prevRow['状態']?.length) return prevRow['状態'][0];
  }

  if (prevRow) {
    if (prevRow['状態']?.length === 1) return prevRow['状態'][0];
    if (prevRow['状態']?.length) return findNamedState(prevRow, state['技名']) ?? prevRow['状態'][0];
    return prevRow;
  }

  return null;
}

function containsDitto(value) {
  if (value === '〃') return true;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.values(value).some(containsDitto);
  }
  return false;
}

function rowContainsDitto(row) {
  if (containsDitto(row)) return true;
  if (Array.isArray(row['状態'])) {
    return row['状態'].some((state) => containsDitto(state));
  }
  return false;
}

function resolveDittoRowsOnce(rows) {
  let prevRow = null;
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (prevRow) resolveDittoInObject(row, prevRow);

    if (Array.isArray(row['状態'])) {
      let prevState = null;
      for (const state of row['状態']) {
        const reference = findStateReference(rows, rowIndex, state, prevState);
        resolveDittoInObject(state, reference);
        prevState = state;
      }
    }

    prevRow = row;
  }
  return rows;
}

export function resolveDittoRows(rows) {
  if (!Array.isArray(rows) || !rows.length) return rows;

  for (let pass = 0; pass < 8; pass++) {
    resolveDittoRowsOnce(rows);
    if (!rows.some(rowContainsDitto)) break;
  }
  return rows;
}

export function resolveCharacterDitto(char) {
  const frame = char.frameData?.['フレームデータ'];
  if (!frame) return char;

  for (const section of Object.values(frame)) {
    if (!section?.rows) continue;
    section.rows = resolveDittoRows(section.rows);
  }
  return char;
}
