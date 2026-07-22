#!/usr/bin/env python3
"""Extract newest CDP log per character name into chars/."""
import json
import glob
import os

LOG_DIR = '/mnt/c/Users/stip/.cursor/browser-logs'
OUT_DIR = '/home/starnak/bulletaction-frame-data/chars'
os.makedirs(OUT_DIR, exist_ok=True)

best = {}
for path in glob.glob(os.path.join(LOG_DIR, 'cdp-response-Runtime.evaluate-*.json')):
    try:
        data = json.load(open(path, encoding='utf-8'))
        value = data.get('result', {}).get('value')
        if not value or 'name' not in value:
            continue
        name = value['name']
        mtime = os.path.getmtime(path)
        if name not in best or mtime > best[name][0]:
            best[name] = (mtime, value, path)
    except Exception:
        pass

for name, (_, value, path) in sorted(best.items()):
    out = os.path.join(OUT_DIR, f'{name}.json')
    json.dump(value, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print(name, os.path.basename(path))

print('total', len(best))
