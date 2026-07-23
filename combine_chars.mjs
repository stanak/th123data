#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { flattenCharacter } from './flatten_frame_data.mjs';
import { CHARACTER_ORDER } from './characters.mjs';
import { patchYoumuSpellStates } from './patch_youmu_spell_states.mjs';
import { patchYoumuMoveNames } from './patch_youmu_move_names.mjs';
import { patchYoumuZujouAdvantage } from './patch_youmu_zujou_advantage.mjs';
import { patchCharacterLvUpEffects } from './patch_lv_up_effects.mjs';
import { patchCharacterBulletQuickRef } from './patch_bullet_quick_ref.mjs';
import { patchCharacterAttackAttributes } from './patch_attack_attributes.mjs';
import { patchSuwakoMoveNames } from './patch_suwako_move_names.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHAR_DIR = path.join(__dirname, 'chars');
const OUT = path.join(__dirname, 'frame_data.json');
const LV_UP_PATH = path.join(__dirname, 'lv_up_effects.json');
const BULLET_QUICK_PATH = path.join(__dirname, 'bullet_quick_ref.json');
const ATTACK_ATTR_PATH = path.join(__dirname, 'attack_attributes.json');
const lvUpData = fs.existsSync(LV_UP_PATH) ? JSON.parse(fs.readFileSync(LV_UP_PATH, 'utf8')) : null;
const bulletQuickData = fs.existsSync(BULLET_QUICK_PATH)
  ? JSON.parse(fs.readFileSync(BULLET_QUICK_PATH, 'utf8'))
  : null;
const attackAttrData = fs.existsSync(ATTACK_ATTR_PATH)
  ? JSON.parse(fs.readFileSync(ATTACK_ATTR_PATH, 'utf8'))
  : null;

const characters = {};
for (const name of CHARACTER_ORDER) {
  const file = path.join(CHAR_DIR, `${name}.json`);
  if (!fs.existsSync(file)) {
    console.warn('missing char file:', name);
    continue;
  }
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  characters[name] = patchSuwakoMoveNames(
    patchYoumuZujouAdvantage(
      patchYoumuMoveNames(patchYoumuSpellStates(flattenCharacter(raw), name), name),
      name,
    ),
    name,
  );
  if (lvUpData) patchCharacterLvUpEffects(characters[name], name, lvUpData);
  if (bulletQuickData) patchCharacterBulletQuickRef(characters[name], name, bulletQuickData);
  if (attackAttrData) patchCharacterAttackAttributes(characters[name], name, attackAttrData);
}

fs.writeFileSync(OUT, JSON.stringify({ characters }, null, 2), 'utf8');
console.log(JSON.stringify({
  path: OUT,
  characterCount: Object.keys(characters).length,
  aliceRows: characters['アリス']?.['必殺技']?.rows?.length,
}, null, 2));
