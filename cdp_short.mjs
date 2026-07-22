#!/usr/bin/env node
/** Build short CDP expression assuming scrapeCharacter is already injected. */
const CHARACTERS = [
  ['霊夢', 158], ['魔理沙', 161], ['パチュリー', 171], ['咲夜', 175],
  ['妖夢', 160], ['レミリア', 163], ['幽々子', 166], ['紫', 173], ['萃香', 177],
  ['鈴仙', 156], ['文', 162], ['小町', 167], ['衣玖', 174], ['天子', 176],
];
const name = process.argv[2];
const id = Number(process.argv[3]);
const pair = name && id ? [[name, id]] : CHARACTERS.filter(([n]) => n !== process.argv[2] || !process.argv[3]);
const targets = name && id ? [[name, id]] : CHARACTERS;
const expr = `(async () => {
  if (typeof scrapeCharacter !== 'function') throw new Error('scrapeCharacter not loaded');
  const CHARS = ${JSON.stringify(targets)};
  const results = [];
  for (const [n, i] of CHARS) {
    try {
      const data = await scrapeCharacter(n, i);
      results.push({ name: n, ok: true, bytes: JSON.stringify(data).length });
    } catch (e) {
      results.push({ name: n, ok: false, error: String(e) });
    }
  }
  return { results };
})()`;
process.stdout.write(JSON.stringify({
  method: 'Runtime.evaluate',
  params: { expression: expr, awaitPromise: true, returnByValue: true },
}));
