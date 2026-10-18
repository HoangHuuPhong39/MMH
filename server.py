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

url = f"http://localhost:{PORT}/index.html"
print("=" * 65)
print(f"  HE THONG ON THI TRAC NGHIEM NHAP MON MAT MA HOC (NMMMH)")
print(f"  Dang khoi chay may chu cuc bo tai: {url}")
print(f"  Mo trinh duyet tu dong... Nhan Ctrl+C de dung.")
print("=" * 65)

webbrowser.open(url)

try:
    httpd.serve_forever()
except KeyboardInterrupt:
    print("\nDa dung may chu.")
