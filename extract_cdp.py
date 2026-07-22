#!/usr/bin/env python3
"""Extract character JSON from CDP response log files."""
import json
import glob
import sys
import os

LOG_DIR = '/mnt/c/Users/stip/.cursor/browser-logs'
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chars')

def extract_from_cdp_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    value = data.get('result', {}).get('value')
    if not value or 'name' not in value:
        return None
    return value

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    files = sorted(glob.glob(os.path.join(LOG_DIR, 'cdp-response-Runtime.evaluate-*.json')))
    saved = {}
    for path in files:
        try:
            char = extract_from_cdp_file(path)
            if char:
                name = char['name']
                out = os.path.join(OUT_DIR, f'{name}.json')
                with open(out, 'w', encoding='utf-8') as f:
                    json.dump(char, f, ensure_ascii=False, indent=2)
                saved[name] = out
                print(f'Saved {name} from {os.path.basename(path)}')
        except Exception as e:
            print(f'Skip {path}: {e}', file=sys.stderr)
    print(f'Total: {len(saved)} characters')
    return saved

if __name__ == '__main__':
    main()
