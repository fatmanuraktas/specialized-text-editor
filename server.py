#!/usr/bin/env python3
"""
Textination Web Application Local Server Launcher with Python Markov ML Backend
"""

import http.server
import socketserver
import webbrowser
import sys
import os
import json
from urllib.parse import parse_qs, urlparse
from markov import MarkovDecisionTree

PORT = 8000
python_markov = MarkovDecisionTree(order=3)

# Default initial training corpus
DEFAULT_CORPUS = [
    "Gecenin karanlığı şehri kapladığında, eski saatin tiktakları yankılanıyordu. Dedektif Ahmet Yılmaz, masasının üzerindeki sararmış dosyaları karıştırırken sokaktan gelen hafif adımları duydu. Her şey o gizemli saatin durduğu an başlamıştı...",
    "Kasabaya ilk kar düşüp yoğun bir sis kapladığında, herkes kütüphanenin ışıklarının ansızın söndüğünü fark etti. Doktor Canan Şahin, elindeki fenerle kütüphaneye doğru adımlarken sisin arasından fısıltılar yükseliyordu..."
]
python_markov.train_corpus(DEFAULT_CORPUS)

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.dirname(os.path.abspath(__file__)), **kwargs)

    def do_GET(self):
        if self.path.startswith('/api/markov/metrics'):
            metrics = python_markov.get_author_metrics()
            self._send_json(metrics)
            return

        if self.path == '/favicon.ico':
            self.send_response(204)
            self.end_headers()
            return

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

        if self.path.startswith('/api/markov/predict'):
            context = body.get('context', '')
            top_k = body.get('top_k', 5)
            predictions = python_markov.predict_next_words(context, top_k)
            self._send_json({"candidates": predictions})
            return

        if self.path.startswith('/api/markov/generate'):
            seed = body.get('seed', 'gecenin')
            max_words = body.get('max_words', 25)
            temp = body.get('temperature', 0.7)
            generated = python_markov.generate_text(seed, max_words, temp)
            self._send_json({"generated_text": generated})
            return

        if self.path.startswith('/api/markov/train'):
            texts = body.get('texts', [])
            if isinstance(texts, str):
                texts = [texts]
            python_markov.train_corpus(texts or DEFAULT_CORPUS)
            metrics = python_markov.get_author_metrics()
            print(f"  🧠 [PYTHON MARKOV ENGINE] Yazar Modeli Yeniden Eğitildi! Toplam Kelime: {metrics['total_words']}")
            self._send_json({"status": "success", "metrics": metrics})
            return

        if self.path.startswith('/api/markov/tree'):
            seed = body.get('seed', 'gecenin')
            tree_data = python_markov.get_tree_branches(seed)
            self._send_json(tree_data)
            return

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
    print(f"  🚀 Textination Web Yazar Editörü & Python Markov ML Backend!")
    print(f"  🌐 Adres: {url}")
    print(f"  🧠 Python Markov ML Engine Yüklendi ({python_markov.total_words} Kelime Eğitildi)")
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
