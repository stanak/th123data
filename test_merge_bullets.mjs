#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { flattenCharacter } from './flatten_frame_data.mjs';
import { mergeCharacterBulletSummaries, isBulletSummaryRow, needsBulletAttackInfo, matchesBulletSummary, mergeBulletSummaries } from './merge_bullet_summaries.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const d = JSON.parse(fs.readFileSync(path.join(__dirname, 'frame_data.json'), 'utf8'));

function buildContext(summaries) {
  const names = summaries.map((s) => s['技名']);
  return {
    names,
    set: new Set(names),
    hasHoldC: names.some((n) => n.startsWith('ホールド版C系射撃')),
    hasHold6B: names.some((n) => n.startsWith('ホールド版6B系射撃')),
    hasHold6C: names.some((n) => n.startsWith('ホールド版6C系射撃')),
    hasHoldJ2C: names.some((n) => n.startsWith('ホールド版J2C系射撃')),
  };
}

let summaryCount = 0;
const unmatchedSummaries = [];
const unmatchedDetails = [];

for (const [char, data] of Object.entries(d.characters)) {
  const rows = data?.['射撃技']?.rows || [];
  const summaries = rows.filter(isBulletSummaryRow);
  summaryCount += summaries.length;
  const ctx = buildContext(summaries);
  const details = rows.filter(needsBulletAttackInfo);
  for (const s of summaries) {
    if (!details.some((r) => matchesBulletSummary(s['技名'], r['技名'], ctx))) {
      unmatchedSummaries.push(`${char}: ${s['技名']}`);
    }
  }
  for (const det of details) {
    if (!summaries.some((s) => matchesBulletSummary(s['技名'], det['技名'], ctx))) {
      unmatchedDetails.push(`${char}: ${det['技名']}`);
    }
  }
}

console.log('summaries', summaryCount);
console.log('unmatched summaries', unmatchedSummaries.length, unmatchedSummaries);
console.log('unmatched details', unmatchedDetails.length, unmatchedDetails);

const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'chars/霊夢.json'), 'utf8'));
const c = mergeCharacterBulletSummaries(flattenCharacter(raw));
const after = c['射撃技'].rows;
console.log('Reimu summaries left', after.filter(isBulletSummaryRow).length);
console.log('Reimu C系-立C', after.find((r) => r['技名'] === 'C系-立C'));
