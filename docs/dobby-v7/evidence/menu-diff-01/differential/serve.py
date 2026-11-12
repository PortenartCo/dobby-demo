from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import os, sys
os.chdir(sys.argv[1])
class Frozen(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(fmt % args, flush=True)
ThreadingHTTPServer.allow_reuse_address = True
ThreadingHTTPServer(('127.0.0.1', 8771), Frozen).serve_forever()
