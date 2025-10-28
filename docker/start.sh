#!/bin/bash
# Start script that runs the echo server and the sandbox SDK control plane

set -e

echo "[START] Starting echo server..."
# Start the echo server in the background
node /sandbox/echo-server.js &

echo "[START] Starting HTTP health check server..."
# Start HTTP server on port 3001 for Cloudflare health checks (foreground)
exec node /sandbox/http-server.js &

echo "[START] Starting sandbox-sdk control plane..."
# Start the Cloudflare control plane (REQUIRED for SDK to work)
exec /container-server/startup.sh
