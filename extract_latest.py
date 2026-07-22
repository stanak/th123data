#!/usr/bin/env python3
"""Extract latest CDP scrape result to chars/{name}.json"""
import json
import glob
import sys

path = sorted(glob.glob('/mnt/c/Users/stip/.cursor/browser-logs/cdp-response-Runtime.evaluate-*.json'))[-1]
data = json.load(open(path, encoding='utf-8'))
value = data.get('result', {}).get('value')
if not value or 'name' not in value:
    print('ERROR: no character data in', path, file=sys.stderr)
    sys.exit(1)
name = value['name']
out = f'/home/starnak/bulletaction-frame-data/chars/{name}.json'
json.dump(value, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print(name, out, len(json.dumps(value)))
