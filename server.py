#!/usr/bin/env python3
"""
Textination Web Application Local Server Launcher
"""

import http.server
import socketserver
import webbrowser
import sys
import os
import json
from urllib.parse import parse_qs, urlparse

PORT = 8000

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.dirname(os.path.abspath(__file__)), **kwargs)

    def do_GET(self):
        if self.path == '/favicon.ico':
            self.send_response(204)
            self.end_headers()
            return

        if self.path.startswith('/api/log'):
            return self._send_json({'status': 'ok'})

        req_path = self.translate_path(self.path)
        if not os.path.exists(req_path) and not '.' in os.path.basename(self.path):
            self.path = '/index.html'

        return super().do_GET()

    def do_POST(self):
        content_len = int(self.headers.get('Content-Length', 0))
        body_bytes = self.rfile.read(content_len) if content_len > 0 else b'{}'
        try:
            body = json.loads(body_bytes.decode('utf-8'))
        except Exception:
            body = {}

        self.send_error(404, "Endpoint Not Found")

    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    handler = Handler

    port = PORT
    for try_port in range(PORT, PORT + 20):
        try:
            httpd = socketserver.TCPServer(("", try_port), handler)
            port = try_port
            break
        except OSError:
            continue

    url = f"http://localhost:{port}"
    print("=" * 60)
    print(f"  🚀 Textination Web Yazar Editörü Server")
    print(f"  🌐 Adres: {url}")
    print("=" * 60)

    try:
        webbrowser.open(url)
    except Exception:
        pass

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nSunucu kapatılıyor.")
        httpd.server_close()
        sys.exit(0)

if __name__ == "__main__":
    main()

