import json
import urllib.request
import ssl
from html.parser import HTMLParser
from http.server import BaseHTTPRequestHandler

class DSEMarketParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_td = False
        self.current_cell_data = []
        self.current_row = []
        self.stocks = []

    def handle_starttag(self, tag, attrs):
        if tag == 'tr':
            self.current_row = []
        elif tag == 'td':
            self.in_td = True
            self.current_cell_data = []

    def handle_endtag(self, tag):
        if tag == 'td':
            self.in_td = False
            cell_text = "".join(self.current_cell_data).strip().replace(',', '')
            self.current_row.append(cell_text)
        elif tag == 'tr':
            if len(self.current_row) >= 10:
                symbol = self.current_row[1]
                if symbol != 'TRADING CODE' and symbol != '':
                    try:
                        ltp = float(self.current_row[2]) if self.current_row[2] not in ['--', '', '0'] else 0
                        high = float(self.current_row[3]) if self.current_row[3] not in ['--', ''] else 0
                        low = float(self.current_row[4]) if self.current_row[4] not in ['--', ''] else 0
                        close = float(self.current_row[5]) if self.current_row[5] not in ['--', ''] else 0
                        ycp = float(self.current_row[6]) if self.current_row[6] not in ['--', ''] else 0
                        change = float(self.current_row[7]) if self.current_row[7] not in ['--', ''] else 0
                        trade = float(self.current_row[8]) if self.current_row[8] not in ['--', ''] else 0
                        value = float(self.current_row[9]) if self.current_row[9] not in ['--', ''] else 0
                        volume = float(self.current_row[10]) if len(self.current_row) > 10 and self.current_row[10] not in ['--', ''] else 0
                        
                        # Calculate change percent safely
                        changePercent = round((change / ycp) * 100, 2) if ycp > 0 else 0

                        self.stocks.append({
                            "symbol": symbol,
                            "ltp": ltp,
                            "high": high,
                            "low": low,
                            "close": close,
                            "ycp": ycp,
                            "change": change,
                            "changePercent": changePercent,
                            "trade": trade,
                            "value": value,
                            "volume": volume
                        })
                    except ValueError:
                        pass 

    def handle_data(self, data):
        if self.in_td:
            self.current_cell_data.append(data)

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            url = "https://www.dsebd.org/latest_share_price_scroll_l.php"
            
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            
            with urllib.request.urlopen(req, context=ctx, timeout=8.0) as response:
                html = response.read().decode('utf-8', errors='ignore')
                
            parser = DSEMarketParser()
            parser.feed(html)
            
            if len(parser.stocks) < 50:
                self.send_error_response(500, "Scraper returned unusually low results")
                return
                
            self.send_success_response(parser.stocks)
            
        except Exception as e:
            self.send_error_response(500, f"Native Mass Sync Error: {str(e)}")

    def send_success_response(self, data):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*') 
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def send_error_response(self, status, message):
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode('utf-8'))