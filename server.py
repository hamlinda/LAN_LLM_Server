#!/usr/bin/env python3
import http.server
import socketserver
import urllib.request
import urllib.error
import sys
import os
import csv
import json
from datetime import datetime

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
        if self.path == '/api/log':
            self.handle_log_request()
        elif self.path.startswith('/api/'):
            self.proxy_request('POST')
        else:
            super().do_POST()

    def handle_log_request(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length) if content_length > 0 else b'{}'
            data = json.loads(body.decode('utf-8'))
            
            model = data.get('model', '')
            prompt = data.get('prompt', '')
            settings = data.get('settings', {})
            metrics = data.get('metrics', {})
            
            temp = settings.get('temperature', '')
            top_p = settings.get('top_p', '')
            top_k = settings.get('top_k', '')
            max_tokens = settings.get('max_tokens', '')
            
            ttft = metrics.get('ttft', '')
            speed = metrics.get('speed', '')
            duration = metrics.get('duration', '')
            tokens_sent = metrics.get('tokens_sent', '')
            tokens_received = metrics.get('tokens_received', '')
            
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            log_dir = '/home/dlh/dlhdev/ollama_local_server/logs'
            log_file = os.path.join(log_dir, 'inference.log')
            
            os.makedirs(log_dir, exist_ok=True)
            file_exists = os.path.isfile(log_file)
            
            with open(log_file, 'a', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                if not file_exists or os.path.getsize(log_file) == 0:
                    writer.writerow([
                        'Timestamp', 'Model', 'Prompt', 'Temperature', 'Top_P', 'Top_K',
                        'Max_Tokens', 'TTFT', 'Speed', 'Duration', 'Tokens_Sent', 'Tokens_Received'
                    ])
                writer.writerow([
                    timestamp, model, prompt, temp, top_p, top_k,
                    max_tokens, ttft, speed, duration, tokens_sent, tokens_received
                ])
                
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'success'}).encode('utf-8'))
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'error', 'message': str(e)}).encode('utf-8'))

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
