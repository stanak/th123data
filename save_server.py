#!/usr/bin/env python3
"""Serve scraper JS and accept character JSON saves."""
import json
import os
from http.server import HTTPServer, BaseHTTPRequestHandler

ROOT = '/home/starnak/bulletaction-frame-data'
OUT_DIR = os.path.join(ROOT, 'chars')
SCRAPER = os.path.join(ROOT, 'scrape_one.min.js')

os.makedirs(OUT_DIR, exist_ok=True)

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path in ('/scrape_one.min.js', '/scraper.js'):
            data = open(SCRAPER, 'rb').read()
            self.send_response(200)
            self.send_header('Content-Type', 'application/javascript')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(data)
            return
        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length)
        try:
            data = json.loads(body.decode('utf-8'))
            name = data.get('name', 'unknown')
            path = os.path.join(OUT_DIR, f'{name}.json')
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(f'saved {name}'.encode())
            print(f'Saved {path}', flush=True)
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(str(e).encode())

    def log_message(self, fmt, *args):
        print(fmt % args, flush=True)

if __name__ == '__main__':
    HTTPServer(('0.0.0.0', 8765), Handler).serve_forever()
