import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 3000

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Find available port if 3000 is occupied
for p in range(PORT, PORT + 20):
    try:
        httpd = socketserver.TCPServer(("", p), Handler)
        PORT = p
        break
    except OSError:
        continue

import socket

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

local_ip = get_local_ip()
url_local = f"http://localhost:{PORT}/index.html"
url_phone = f"http://{local_ip}:{PORT}/index.html"

print("=" * 70)
print(f"  HE THONG ON THI TRAC NGHIEM NHAP MON MAT MA HOC (NMMMH)")
print(f"  1. Tren may tinh: {url_local}")
print(f"  2. Tren dien thoai (cung Wi-Fi): {url_phone}")
print(f"  Dang mo trinh duyet... Nhan Ctrl+C de dung.")
print("=" * 70)

webbrowser.open(url_local)

try:
    httpd.serve_forever()
except KeyboardInterrupt:
    print("\nDa dung may chu.")
