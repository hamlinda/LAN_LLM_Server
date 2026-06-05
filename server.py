#!/usr/bin/env python3
import http.server
import socketserver
import urllib.request
import urllib.error
import sys

PORT = 8080
BIND_ADDRESS = '0.0.0.0'
TARGET_OLLAMA = 'http://127.0.0.1:11434'

class ProxyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_OPTIONS(self):
        # Handle preflight CORS requests
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_GET(self):
        if self.path.startswith('/api/'):
            self.proxy_request('GET')
        else:
            super().do_GET()

    def do_POST(self):
        if self.path.startswith('/api/'):
            self.proxy_request('POST')
        else:
            super().do_POST()

    def proxy_request(self, method):
        target_url = f"{TARGET_OLLAMA}{self.path}"
        
        # Read request body if present
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length) if content_length > 0 else None
        
        # Build headers to pass to target
        headers = {}
        for key, val in self.headers.items():
            if key.lower() not in ('host', 'content-length', 'connection', 'origin', 'referer'):
                headers[key] = val
                
        req = urllib.request.Request(target_url, data=body, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req) as res:
                self.send_response(res.status)
                for key, val in res.headers.items():
                    if key.lower() not in ('transfer-encoding', 'connection', 'content-length', 'access-control-allow-origin'):
                        self.send_header(key, val)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
                self.end_headers()
                
                # Stream the response back to the client chunk-by-chunk
                while True:
                    chunk = res.read(4096)
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    self.wfile.flush()
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            # Copy response headers from the error if available
            for key, val in e.headers.items():
                if key.lower() not in ('transfer-encoding', 'connection', 'content-length', 'access-control-allow-origin'):
                    self.send_header(key, val)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            self.end_headers()
            self.wfile.write(e.read())
        except Exception as e:
            self.send_response(500)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(str(e).encode('utf-8'))

class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    pass

if __name__ == '__main__':
    handler = ProxyHTTPRequestHandler
    # Threading server allows concurrent connections (useful for streaming and checking tags simultaneously)
    with ThreadingHTTPServer((BIND_ADDRESS, PORT), handler) as httpd:
        print(f"Serving Ollama Client at http://{BIND_ADDRESS}:{PORT}/")
        print(f"Proxying /api/ calls to {TARGET_OLLAMA}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
            sys.exit(0)
