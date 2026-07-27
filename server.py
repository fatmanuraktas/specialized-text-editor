#!/usr/bin/env python3
"""
Textination Web Application Local Server Launcher
"""

import http.server
import socketserver
import webbrowser
import sys
import os

PORT = 8000

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.dirname(os.path.abspath(__file__)), **kwargs)

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    handler = Handler

    # Find open port if 8000 is occupied
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
    print(f"  🚀 Textination Web Yazar Editörü & Polisiye Pano Sunucusu Başlatıldı!")
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
