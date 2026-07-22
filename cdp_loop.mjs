#!/usr/bin/env node
/**
 * Run CDP scrapes by printing progress; extracts after manual MCP or
 * when CDP log files update. Usage after each browser_cdp scrape:
 *   node cdp_loop.mjs extract
 * Or to list remaining characters:
 *   node cdp_loop.mjs list
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHAR_DIR = path.join(__dirname, 'chars');
const PAYLOAD_DIR = path.join(__dirname, 'cdp_payloads');

const ALL = [
  '早苗', 'チルノ', '美鈴', '空', '諏訪子', '霊夢', '魔理沙', 'アリス', 'パチュリー', '咲夜',
  '妖夢', 'レミリア', '幽々子', '紫', '萃香', '鈴仙', '文', '小町', '衣玖', '天子',
];

function hasFixes(name) {
  const file = path.join(CHAR_DIR, `${name}.json`);
  if (!fs.existsSync(file)) return false;
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes('フレームデータ')) return false;
  // fixed chars shouldn't have bare "+A" as 技名 (except in notes/titles)
  return !/\"技名\": \"\+A\"/.test(text);
}

const cmd = process.argv[2] || 'list';
if (cmd === 'list') {
  const done = ALL.filter(hasFixes);
  const todo = ALL.filter((n) => !hasFixes(n));
  console.log(JSON.stringify({ done, todo }, null, 2));
} else if (cmd === 'extract') {
  execSync('python3 ' + path.join(__dirname, 'extract_latest.py'), { stdio: 'inherit' });
} else if (cmd === 'payload') {
  const name = process.argv[3];
  const payload = JSON.parse(fs.readFileSync(path.join(PAYLOAD_DIR, `${name}.json`), 'utf8'));
  process.stdout.write(JSON.stringify(payload.params));
}
