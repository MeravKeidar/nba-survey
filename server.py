#!/usr/bin/env python3
"""
HTTP server for the motion survey.
Serves video files with range-request support so browsers can seek.

Usage:
    python3 server.py [port]          (default: 8000)

For remote access, expose the port with ngrok in a second terminal:
    ngrok http 8000
"""
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
SURVEY_DIR = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=SURVEY_DIR, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def log_message(self, fmt, *args):
        print(f"  {self.address_string()}  {fmt % args}")


if __name__ == "__main__":
    os.chdir(SURVEY_DIR)
    with http.server.HTTPServer(("", PORT), Handler) as httpd:
        print(f"Survey server running:")
        print(f"  Local:   http://localhost:{PORT}")
        print(f"  Network: http://0.0.0.0:{PORT}")
        print()
        print("For remote access, in a second terminal run:")
        print(f"  ngrok http {PORT}")
        print()
        print("Press Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
