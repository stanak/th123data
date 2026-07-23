#!/usr/bin/env node
import { getCategorySection } from './character_frame.mjs';
/** Patch 妖夢 spell cards with advantage-table states during 幽明の苦輪 / 幽明求問持聡明の法. */

export const YOUMU_SPELL_ADVANTAGE_STATES = [
  { 技名: '近A', 有利差: { 正G: '+9', 通常: '+10' } },
  { 技名: 'AA', 有利差: { 正G: '+9', 通常: '+10' } },
  { 技名: 'AAA', 有利差: { 正G: '+5', 誤G: '+9', 通常: '+7' } },
  { 技名: 'AAAA', 有利差: { 正G: '+7', 誤G: '+13', 通常: 'down' } },
  { 技名: 'AAAAA', 有利差: { 正G: '-1', 誤G: '+5', 通常: 'down' } },
  { 技名: '遠A', 有利差: { 正G: '+9', 誤G: '+13', 通常: '+11' } },
  { 技名: '近屈A', 有利差: { 正G: '+8', 誤G: '+10', 通常: '+9' } },
  { 技名: '遠屈A', 有利差: { 正G: '+11', 誤G: '+15', 通常: '+13' } },
  { 技名: '6A', 有利差: { 正G: '+5', 誤G: '+11', 通常: 'down' } },
  { 技名: 'H6A', 有利差: { 正G: '+7', 誤G: 'down', 通常: 'down' } },
  { 技名: '3A', 有利差: { 正G: '+7', 誤G: '+13', 通常: 'down' } },
  { 技名: 'H4A', 有利差: { 正G: '+7', 誤G: 'down', 通常: 'down' } },
  { 技名: 'DA（1段目）', 有利差: { 正G: '+4', 誤G: '+8', 通常: '+6' } },
  { 技名: 'DA（2段目）', 有利差: { 正G: '+5', 誤G: '+11', 通常: 'down' } },
  { 技名: 'DB', 有利差: { 正G: '+1', 誤G: '+7', 通常: 'down' } },
  { 技名: 'DC', 有利差: { 正G: '-1', 誤G: '+5', 通常: 'down' } },
];

export function patchYoumuSpellStates(char, characterName) {
  if (characterName !== '妖夢') return char;

  const section = getCategorySection(char, 'スペルカード');
  if (!section?.rows) return char;

  const states = structuredClone(YOUMU_SPELL_ADVANTAGE_STATES);

  section.rows = section.rows
    .filter((row) => typeof row['技名'] === 'string')
    .map((row) => {
      if (row['技名'] === '幽明の苦輪' || row['技名'] === '幽明求問持聡明の法') {
        return { ...row, 状態: structuredClone(states) };
      }
      return row;
    });

  return char;
}
