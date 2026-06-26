import json
import urllib.request
import ssl
from html.parser import HTMLParser
from urllib.parse import urlparse, parse_qs
from http.server import BaseHTTPRequestHandler
from datetime import datetime, timedelta

class DSEArchiveParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_td = False
        self.current_row = []
        self.table_data = []

    def handle_starttag(self, tag, attrs):
        if tag == 'td':
            self.in_td = True

    def handle_endtag(self, tag):
        if tag == 'td':
            self.in_td = False
        elif tag == 'tr':
            if len(self.current_row) >= 10:
                self.table_data.append(self.current_row)
            self.current_row = []

    def handle_data(self, data):
        if self.in_td:
            self.current_row.append(data.strip().replace(',', ''))

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        query = parse_qs(urlparse(self.path).query)
        symbol = query.get('symbol', [None])[0]

        if not symbol:
            self.send_error_response(400, "Symbol required")
            return

        try:
            end_date = datetime.today()
            start_date = end_date - timedelta(days=90)
            
            start_str = start_date.strftime('%Y-%m-%d')
            end_str = end_date.strftime('%Y-%m-%d')
            
            url = f"https://www.dsebd.org/day_end_archive.php?startDate={start_str}&endDate={end_str}&inst={symbol.upper()}&archive=data"
            
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            
            with urllib.request.urlopen(req, context=ctx, timeout=8.0) as response:
                html = response.read().decode('utf-8', errors='ignore')
                
            parser = DSEArchiveParser()
            parser.feed(html)
            
            chart_data = []
            
            for row in parser.table_data:
                try:
                    date_str = row[1]
                    if "-" not in date_str:
                        continue
                    
                    # DSE Archive Map: 1:Date, 4:High, 5:Low, 6:Open, 7:Close, 10:Volume
                    chart_data.append({
                        'date': date_str,
                        'open': float(row[6]) if row[6] not in ['--', '', '0'] else 0,
                        'high': float(row[4]) if row[4] not in ['--', '', '0'] else 0,
                        'low': float(row[5]) if row[5] not in ['--', '', '0'] else 0,
                        'close': float(row[7]) if row[7] not in ['--', '', '0'] else 0,
                        'volume': int(float(row[10])) if len(row) > 10 and row[10] not in ['--', '', '0'] else 0
                    })
                except (IndexError, ValueError):
                    continue
                    
            if not chart_data:
                self.send_error_response(404, "No data found")
                return
                
            chart_data.reverse()
            self.send_success_response(chart_data)

        except Exception as e:
            self.send_error_response(500, f"Scraper Error: {str(e)}")

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