#!/usr/bin/env node
/**
 * Re-scrape via Playwright navigation (avoids fetch/Cloudflare issues).
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHAR_DIR = path.join(__dirname, 'chars');
const SCRAPER = fs.readFileSync(path.join(__dirname, 'scrape_one.js'), 'utf8');
const BASE = 'https://w.atwiki.jp/bulletaction/pages';

const CHARACTERS = [
  ['早苗', 157], ['チルノ', 159], ['美鈴', 164], ['空', 172], ['諏訪子', 178],
  ['霊夢', 158], ['魔理沙', 161], ['アリス', 165], ['パチュリー', 171], ['咲夜', 175],
  ['妖夢', 160], ['レミリア', 163], ['幽々子', 166], ['紫', 173], ['萃香', 177],
  ['鈴仙', 156], ['文', 162], ['小町', 167], ['衣玖', 174], ['天子', 176],
];

async function loadHtml(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(2000);
  const html = await page.content();
  if (!html.includes('wikibody')) {
    await page.waitForTimeout(3000);
    const retry = await page.content();
    if (!retry.includes('wikibody')) throw new Error(`Missing wikibody: ${url}`);
    return retry;
  }
  return html;
}

async function scrapeChar(page, name, id) {
  const mainUrl = `${BASE}/${id}.html`;
  const htmlMap = {};
  htmlMap[mainUrl] = await loadHtml(page, mainUrl);

  const subpageLinks = await page.evaluate(({ scraper, htmlMap, mainUrl }) => {
    eval(scraper);
    const doc = new DOMParser().parseFromString(htmlMap[mainUrl], 'text/html');
    const main = doc.querySelector('#wikibody');
    const links = [];
    main?.querySelectorAll('h3').forEach((el) => {
      if ((el.textContent || '').replace(/\s+/g, ' ').trim() !== '必殺技') return;
      let sib = el.nextElementSibling;
      while (sib && !['H2', 'H3'].includes(sib.tagName)) {
        sib.querySelectorAll('a[href*="/pages/"]').forEach((a) => {
          const text = (a.textContent || '').replace(/\s+/g, ' ').trim();
          let href = a.getAttribute('href') || '';
          if (href.startsWith('//')) href = 'https:' + href;
          else if (href.startsWith('/')) href = 'https://w.atwiki.jp' + href;
          else if (!href.startsWith('http')) href = 'https://w.atwiki.jp/bulletaction/' + href;
          if (text && !text.startsWith('*') && href) links.push({ text, url: href });
        });
        sib = sib.nextElementSibling;
      }
    });
    return links;
  }, { scraper: SCRAPER, htmlMap, mainUrl });

  for (const link of subpageLinks) {
    if (!htmlMap[link.url]) {
      process.stderr.write(`  subpage ${link.text}\n`);
      try {
        htmlMap[link.url] = await loadHtml(page, link.url);
      } catch (e) {
        process.stderr.write(`  WARN subpage failed ${link.text}: ${e.message}\n`);
      }
    }
  }

  return page.evaluate(async ({ scraper, name, id, htmlMap }) => {
    eval(scraper);
    window.__htmlCache = htmlMap;
    window.__htmlCacheOnly = true;
    return await scrapeCharacter(name, id);
  }, { scraper: SCRAPER, name, id, htmlMap });
}

async function main() {
  fs.mkdirSync(CHAR_DIR, { recursive: true });
  const only = process.argv.slice(2);
  const targets = only.length ? CHARACTERS.filter(([n]) => only.includes(n)) : CHARACTERS;

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  for (const [name, id] of targets) {
    process.stderr.write(`Scraping ${name}...\n`);
    try {
      const data = await scrapeChar(page, name, id);
      if (!data.frameData || !Object.keys(data.frameData).length) {
        throw new Error('empty frameData');
      }
      fs.writeFileSync(path.join(CHAR_DIR, `${name}.json`), JSON.stringify(data, null, 2), 'utf8');
      process.stderr.write(`  saved (${Object.keys(data.frameData).length} sections)\n`);
    } catch (e) {
      process.stderr.write(`  ERROR: ${e.message}\n`);
    }
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
