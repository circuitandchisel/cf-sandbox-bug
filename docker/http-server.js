#!/usr/bin/env node
/**
 * Simple HTTP server for Cloudflare health checks on port 3000
 */

const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', message: 'Sandbox ready' }));
});

server.listen(3000, '0.0.0.0', () => {
  console.log('[HTTP-SERVER] Health check server listening on port 3000');
});

// Keep the process alive
process.on('SIGTERM', () => {
  console.log('[HTTP-SERVER] Received SIGTERM, shutting down...');
  server.close(() => {
    process.exit(0);
  });
});
