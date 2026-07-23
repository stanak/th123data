#!/usr/bin/env node
/** Flatten nested frame data: drop headers/metadata, merge rows, add コマンド. */

import { mergeCharacterBulletSummaries } from './merge_bullet_summaries.mjs';
import { nestCharacterMoveStates } from './nest_move_states.mjs';
import { dedupeCharacterRows } from './dedupe_rows.mjs';
import { normalizeCharacterMoveNames } from './normalize_move.mjs';
import { normalizeCharacterFrameValues } from './normalize_frame_values.mjs';
import { normalizeCharacterSpecialMoves } from './normalize_special_moves.mjs';
import { mergeCharacterMoveAttackStubs } from './merge_move_attack_stubs.mjs';
import { propagateCharacterParentAttackInfo } from './propagate_parent_attack_info.mjs';
import { resolveCharacterDitto } from './resolve_ditto.mjs';
import { expandCharacterLvRanges } from './expand_lv_ranges.mjs';
import { mergeCharacterMovesByName } from './merge_moves_by_name.mjs';

const SKIP_KEYS = new Set([
  'tables', 'subsections', 'pages', 'notes', 'content', 'footnotes',
  'url', 'title', 'error', 'headers', 'rows', 'name', 'pageUrl', 'frameData',
]);

export function extractCommand(key) {
  if (typeof key !== 'string') return null;
  const m = key.match(/^[（(]?(\d+)[）)]?系統$/);
  return m ? m[1] : null;
}

function rowWithCommand(row, command) {
  const { 技名, コマンド, ...rest } = row;
  const entry = {};
  if (command != null && コマンド == null) entry.コマンド = command;
  else if (コマンド != null) entry.コマンド = コマンド;
  if (技名 != null) entry.技名 = 技名;
  return { ...entry, ...rest };
}

function appendTableRows(tables, ctx, out) {
  if (!Array.isArray(tables)) return;
  for (const table of tables) {
    for (const row of table.rows || []) {
      out.push(rowWithCommand(structuredClone(row), ctx.command));
    }
  }
}

function collectFromNode(node, ctx, out) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return;

  appendTableRows(node.tables, ctx, out);

  if (node.subsections && typeof node.subsections === 'object') {
    for (const sub of Object.values(node.subsections)) {
      collectFromNode(sub, ctx, out);
    }
  }

  if (node.pages && typeof node.pages === 'object') {
    for (const page of Object.values(node.pages)) {
      collectFromNode(page.content ?? page, ctx, out);
    }
  }

  if (node.content && typeof node.content === 'object' && !node.pages) {
    collectFromNode(node.content, ctx, out);
  }

  for (const [key, val] of Object.entries(node)) {
    if (SKIP_KEYS.has(key) || !val || typeof val !== 'object' || Array.isArray(val)) continue;
    const cmd = extractCommand(key);
    if (cmd) {
      for (const child of Object.values(val)) {
        collectFromNode(child, { ...ctx, command: cmd }, out);
      }
    } else {
      collectFromNode(val, ctx, out);
    }
  }
}

export function flattenSection(section) {
  if (!section || typeof section !== 'object') return { rows: [] };
  const rows = [];
  collectFromNode(section, {}, rows);
  const out = { rows };
  if (Array.isArray(section.notes) && section.notes.length > 0) {
    out.notes = section.notes;
  }
  return out;
}

export function flattenCharacter(char) {
  const out = {};
  if (char.footnotes && Object.keys(char.footnotes).length > 0) {
    out.footnotes = char.footnotes;
  }
  const frameData = {};
  for (const [sectionKey, sectionVal] of Object.entries(char.frameData || {})) {
    if (!sectionVal || typeof sectionVal !== 'object') continue;
    frameData[sectionKey] = {};
    for (const [category, categoryVal] of Object.entries(sectionVal)) {
      frameData[sectionKey][category] = flattenSection(categoryVal);
    }
  }
  if (Object.keys(frameData).length > 0) out.frameData = frameData;
  return mergeCharacterMovesByName(
    expandCharacterLvRanges(
      dedupeCharacterRows(
        resolveCharacterDitto(
          propagateCharacterParentAttackInfo(
            nestCharacterMoveStates(
              normalizeCharacterFrameValues(
                mergeCharacterMoveAttackStubs(
                  normalizeCharacterSpecialMoves(normalizeCharacterMoveNames(mergeCharacterBulletSummaries(out))),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

export function flattenFrameData(input) {
  const characters = {};
  for (const [name, char] of Object.entries(input.characters || input)) {
    characters[name] = flattenCharacter(char);
  }
  return { characters };
}
