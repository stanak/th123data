#!/usr/bin/env node
/** Print CDP expression for a character (for manual/browser automation). */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const name = process.argv[2];
const payload = JSON.parse(fs.readFileSync(path.join(__dirname, 'cdp_payloads', `${name}.json`), 'utf8'));
process.stdout.write(payload.params.expression);
