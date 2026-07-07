#!/usr/bin/env bash
# Выкат на Vultr-сервере. Запускать НА сервере из /opt/azkar.
set -euo pipefail

cd /opt/azkar
echo "→ git pull"
git pull --ff-only

echo "→ npm install (bot)"
cd bot
npm ci --omit=dev

echo "→ restart service"
sudo systemctl restart azkar
sleep 2
sudo systemctl --no-pager status azkar | head -5

echo "→ health"
curl -sf http://127.0.0.1:3010/health && echo " ✅ deployed"
