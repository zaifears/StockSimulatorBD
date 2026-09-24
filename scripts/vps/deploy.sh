#!/usr/bin/env bash
set -e

# ==============================================================================
# StockSimulatorBD - Oracle VPS Automated Deployment Script
# ==============================================================================

DEPLOY_DIR="/home/ubuntu/stocksimulator-vps"

echo "=== 1. Setting up directory structure ==="
mkdir -p "$DEPLOY_DIR/data"
mkdir -p "$DEPLOY_DIR/scrapers"

echo "=== 2. Setting up Python virtual environment ==="
if [ ! -d "$DEPLOY_DIR/venv" ]; then
    echo "Creating virtual environment at $DEPLOY_DIR/venv..."
    python3 -m venv "$DEPLOY_DIR/venv"
fi

echo "Installing/upgrading dependencies..."
"$DEPLOY_DIR/venv/bin/pip" install --upgrade pip --quiet
"$DEPLOY_DIR/venv/bin/pip" install -r "$DEPLOY_DIR/requirements.txt" --quiet

echo "=== 3. Configuring systemd services ==="
sudo cp "$DEPLOY_DIR/stocksimulator-daemon.service" /etc/systemd/system/
sudo cp "$DEPLOY_DIR/stocksimulator-crawler.service" /etc/systemd/system/
sudo cp "$DEPLOY_DIR/stocksimulator-crawler.timer" /etc/systemd/system/

sudo systemctl daemon-reload

echo "=== 4. Starting daemon service ==="
sudo systemctl enable stocksimulator-daemon.service
sudo systemctl restart stocksimulator-daemon.service

echo "=== 5. Starting overnight crawler timer ==="
sudo systemctl enable stocksimulator-crawler.timer
sudo systemctl start stocksimulator-crawler.timer

echo "=== 6. Verifying local health ==="
sleep 2
if curl -s http://127.0.0.1:8005/health | grep -q "healthy"; then
    echo " Daemon is UP and HEALTHY on http://127.0.0.1:8005/health"
else
    echo "❌ Daemon health check failed! Checking journalctl:"
    sudo journalctl -u stocksimulator-daemon -n 20 --no-pager
    exit 1
fi

echo "=== 7. Configuring Caddy for dse.shahoriar.bd ==="
CADDYFILE="/etc/caddy/Caddyfile"
if ! grep -q "dse.shahoriar.bd" "$CADDYFILE"; then
    echo "Adding dse.shahoriar.bd reverse proxy to $CADDYFILE..."
    sudo bash -c 'cat << "EOF" >> /etc/caddy/Caddyfile

dse.shahoriar.bd {
	reverse_proxy 127.0.0.1:8005
}
EOF'
    sudo systemctl reload caddy
    echo " Caddy reloaded successfully with dse.shahoriar.bd"
else
    echo "ℹ dse.shahoriar.bd already configured in $CADDYFILE"
    sudo systemctl reload caddy
fi

echo "=== Deployment Complete! ==="
