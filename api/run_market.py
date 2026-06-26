import sys
sys.path.insert(0, 'api')
from http.server import HTTPServer
from market_sync import handler
print('Market Sync at http://127.0.0.1:8002')
HTTPServer(('127.0.0.1', 8002), handler).serve_forever()