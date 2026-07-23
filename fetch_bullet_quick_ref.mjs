#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { CHARACTER_ORDER } from './characters.mjs';
import { CHARACTER_OVERVIEW_PAGES } from './character_overview_pages.mjs';
import { PARSE_BULLET_QUICK_REF_JS } from './wiki_bullet_quick_parse.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'bullet_quick_ref.json');
const BASE = 'https://w.atwiki.jp/bulletaction/pages';

export async function fetchBulletQuickRef(options = {}) {
  const browser = await chromium.launch({
    headless: options.headless !== false,
    args: ['--no-sandbox'],
  });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const characters = {};
  const errors = {};
  const names = options.characters ?? CHARACTER_ORDER;

  for (const name of names) {
    const pageId = CHARACTER_OVERVIEW_PAGES[name];
    if (!pageId) {
      errors[name] = 'missing overview page id';
      continue;
    }
    let lastErr = null;
    for (let attempt = 1; attempt <= (options.retries ?? 3); attempt++) {
      const page = await context.newPage();
      try {
        const url = `${BASE}/${pageId}.html`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
        for (let i = 0; i < 18; i++) {
          if (await page.locator('#wikibody').count()) break;
          await page.waitForTimeout(5000);
        }
        if (!(await page.locator('#wikibody').count())) throw new Error('wikibody not found');
        const result = await page.evaluate(PARSE_BULLET_QUICK_REF_JS);
        if (result?.error) throw new Error(result.error);
        characters[name] = {
          pageId,
          url,
          rowCount: result.rows.length,
          rows: result.rows,
        };
        console.log(JSON.stringify({ character: name, pageId, rowCount: result.rows.length, attempt }));
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        console.error(JSON.stringify({ character: name, attempt, error: String(err.message || err) }));
        await new Promise((r) => setTimeout(r, 5000 * attempt));
      } finally {
        await page.close();
      }
    }
    if (lastErr) errors[name] = String(lastErr.message || lastErr);
    if (options.delayMs) await new Promise((r) => setTimeout(r, options.delayMs));
  }

  await browser.close();
  return {
    generatedAt: new Date().toISOString(),
    source: BASE,
    characters,
    errors,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const only = process.argv.slice(2);
  const data = await fetchBulletQuickRef({
    delayMs: 3000,
    characters: only.length ? only : undefined,
  });
  let merged = data;
  if (fs.existsSync(OUT)) {
    const prev = JSON.parse(fs.readFileSync(OUT, 'utf8'));
    merged = {
      ...prev,
      generatedAt: data.generatedAt,
      characters: { ...prev.characters, ...data.characters },
      errors: { ...prev.errors },
    };
    for (const name of Object.keys(data.characters)) delete merged.errors[name];
    for (const [name, err] of Object.entries(data.errors)) merged.errors[name] = err;
  }
  fs.writeFileSync(OUT, JSON.stringify(merged, null, 2), 'utf8');
  console.log(
    JSON.stringify(
      {
        out: OUT,
        characters: Object.keys(merged.characters).length,
        errors: Object.keys(merged.errors).length,
      },
      null,
      2,
    ),
  );
}
