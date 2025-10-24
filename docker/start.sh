#!/bin/bash
# Start script that runs both the echo server and HTTP health check server

set -e

echo "[START] Starting echo server..."
# Start the echo server in the background
node /sandbox/echo-server.js &

echo "[START] Starting HTTP health check server..."
# Start HTTP server on port 3000 for Cloudflare health checks (foreground)
exec node /sandbox/http-server.js
