#!/usr/bin/env node
/** Print CDP expression for a character (for manual/browser automation). */
import fs from 'fs';
const name = process.argv[2];
const payload = JSON.parse(fs.readFileSync(`/home/starnak/bulletaction-frame-data/cdp_payloads/${name}.json`, 'utf8'));
process.stdout.write(payload.params.expression);
