#!/usr/bin/env node
/** Build CDP expression that scrapes all characters and POSTs each to save_server. */
import fs from 'fs';

const code = fs.readFileSync(new URL('./scrape_one.min.js', import.meta.url), 'utf8');
const CHARACTERS = [
  ['早苗', 157], ['チルノ', 159], ['美鈴', 164], ['空', 172], ['諏訪子', 178],
  ['霊夢', 158], ['魔理沙', 161], ['アリス', 165], ['パチュリー', 171], ['咲夜', 175],
  ['妖夢', 160], ['レミリア', 163], ['幽々子', 166], ['紫', 173], ['萃香', 177],
  ['鈴仙', 156], ['文', 162], ['小町', 167], ['衣玖', 174], ['天子', 176],
];

const charsJson = JSON.stringify(CHARACTERS);
const expr = `(async ()=>{
${code}
const CHARS = ${charsJson};
const SAVE = 'http://127.0.0.1:8765';
const results = [];
for (const [name, id] of CHARS) {
  try {
    const data = await scrapeCharacter(name, id);
    await fetch(SAVE, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
    results.push({ name, ok: true });
  } catch (e) {
    results.push({ name, ok: false, error: String(e) });
  }
}
return { count: results.length, results };
})()`;

process.stdout.write(JSON.stringify({
  method: 'Runtime.evaluate',
  params: { expression: expr, awaitPromise: true, returnByValue: true },
}));
