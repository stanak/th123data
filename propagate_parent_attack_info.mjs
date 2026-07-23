#!/usr/bin/env node
/** Copy parent 攻撃Lv/攻撃分類 into 状態 entries when missing. */

function propagateAttackInfo(row) {
  if (!Array.isArray(row['状態']) || !row['状態'].length) return row;

  const attackLv = row['攻撃Lv'];
  const attackClass = row['攻撃分類'];
  if (attackLv == null && attackClass == null) return row;

  row['状態'] = row['状態'].map((state) => {
    const copy = { ...state };
    if (copy['攻撃Lv'] == null && attackLv != null) copy['攻撃Lv'] = attackLv;
    if (copy['攻撃分類'] == null && attackClass != null) copy['攻撃分類'] = attackClass;
    return copy;
  });
  return row;
}

export function propagateParentAttackInfoRows(rows) {
  if (!Array.isArray(rows) || !rows.length) return rows;
  return rows.map((row) => {
    if (!row['状態']) return row;
    return propagateAttackInfo(structuredClone(row));
  });
}

export function propagateCharacterParentAttackInfo(char) {
  const frame = char.frameData?.['フレームデータ'];
  if (!frame) return char;

  for (const section of Object.values(frame)) {
    if (!section?.rows) continue;
    section.rows = propagateParentAttackInfoRows(section.rows);
  }
  return char;
}
