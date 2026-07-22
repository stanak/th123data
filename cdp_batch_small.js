(async () => {
  const SAVE = 'http://127.0.0.1:8765';
  const SCRAPER = SAVE + '/scrape_one.min.js';
  const code = await (await fetch(SCRAPER)).text();
  eval(code);
  const CHARS = [
    ['早苗', 157], ['チルノ', 159], ['美鈴', 164], ['空', 172], ['諏訪子', 178],
    ['霊夢', 158], ['魔理沙', 161], ['アリス', 165], ['パチュリー', 171], ['咲夜', 175],
    ['妖夢', 160], ['レミリア', 163], ['幽々子', 166], ['紫', 173], ['萃香', 177],
    ['鈴仙', 156], ['文', 162], ['小町', 167], ['衣玖', 174], ['天子', 176],
  ];
  const results = [];
  for (const [name, id] of CHARS) {
    try {
      const data = await scrapeCharacter(name, id);
      await fetch(SAVE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      results.push({ name, ok: true });
    } catch (e) {
      results.push({ name, ok: false, error: String(e) });
    }
  }
  return { count: results.length, results };
})()
