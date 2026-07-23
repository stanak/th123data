#!/usr/bin/env node
/** 天子: 六震-相- の誤った 状態:相 を解消する。 */

function hoistNestedState(row, stateKey) {
  if (!row?.Lv || typeof row.Lv !== 'object') return;
  for (const lvObj of Object.values(row.Lv)) {
    if (!lvObj || typeof lvObj !== 'object') continue;
    for (const cmdObj of Object.values(lvObj)) {
      if (!cmdObj?.状態?.[stateKey] || typeof cmdObj.状態 !== 'object') continue;
      const state = cmdObj.状態[stateKey];
      delete cmdObj.状態;
      delete cmdObj._nameState;
      for (const [key, value] of Object.entries(state)) {
        if (key === '技名') continue;
        cmdObj[key] = value;
      }
    }
  }
}

export function patchTenshiMoveNames(char, characterName) {
  if (characterName !== '天子') return char;

  const section = char['必殺技'];
  if (!section?.rows) return char;
  for (const row of section.rows) {
    if (!/^六震-相-?$/.test(row['技名'] ?? '')) continue;
    row['技名'] = '六震-相-';
    hoistNestedState(row, '相');
  }
  return char;
}
