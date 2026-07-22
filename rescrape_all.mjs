#!/usr/bin/env node
/** Build CDP Runtime.evaluate expression for one character. */
import fs from 'fs';

const code = fs.readFileSync(new URL('./scrape_one.min.js', import.meta.url), 'utf8');
const CHARACTERS = [
  ['早苗', 157], ['チルノ', 159], ['美鈴', 164], ['空', 172], ['諏訪子', 178],
  ['霊夢', 158], ['魔理沙', 161], ['アリス', 165], ['パチュリー', 171], ['咲夜', 175],
  ['妖夢', 160], ['レミリア', 163], ['幽々子', 166], ['紫', 173], ['萃香', 177],
  ['鈴仙', 156], ['文', 162], ['小町', 167], ['衣玖', 174], ['天子', 176],
];

const name = process.argv[2];
const id = Number(process.argv[3]);
if (!name || !id) {
  console.error('Usage: rescrape_all.mjs <name> <pageId>');
  process.exit(1);
}

const expr = `(async ()=>{${code}\nreturn await scrapeCharacter(${JSON.stringify(name)},${id});})()`;
const payload = {
  method: 'Runtime.evaluate',
  params: { expression: expr, awaitPromise: true, returnByValue: true },
};
process.stdout.write(JSON.stringify(payload));
