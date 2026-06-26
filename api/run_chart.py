import sys
sys.path.insert(0, 'api')
from http.server import HTTPServer
from dse_chart import handler
print('DSE Chart at http://127.0.0.1:8001')
HTTPServer(('127.0.0.1', 8001), handler).serve_forever()