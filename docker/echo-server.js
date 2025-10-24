#!/usr/bin/env node
/**
 * Minimal UDS Echo Server
 * Listens on a Unix Domain Socket and echoes back any messages received
 */

const net = require('net');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SOCKET_PATH = path.join(os.tmpdir(), 'echo-server.sock');

console.log('[ECHO-SERVER] Starting...');
console.log('[ECHO-SERVER] Node version:', process.version);
console.log('[ECHO-SERVER] Socket path:', SOCKET_PATH);

// Clean up existing socket
if (fs.existsSync(SOCKET_PATH)) {
  console.log('[ECHO-SERVER] Removing existing socket');
  fs.unlinkSync(SOCKET_PATH);
}

// Create server
const server = net.createServer((socket) => {
  console.log('[ECHO-SERVER] Client connected');

  let buffer = '';

  socket.on('data', (data) => {
    buffer += data.toString();
    console.log('[ECHO-SERVER] Received data chunk, buffer length:', buffer.length);

    // Process line-by-line (messages end with newline)
    while (buffer.includes('\n')) {
      const newlineIndex = buffer.indexOf('\n');
      const message = buffer.substring(0, newlineIndex);
      buffer = buffer.substring(newlineIndex + 1);

      console.log('[ECHO-SERVER] Received complete message:', message);

      // Echo it back
      const echo = `ECHO: ${message}\n`;
      console.log('[ECHO-SERVER] Sending echo:', echo.trim());
      socket.write(echo);
    }
  });

  socket.on('end', () => {
    console.log('[ECHO-SERVER] Client disconnected');
  });

  socket.on('error', (err) => {
    console.error('[ECHO-SERVER] Socket error:', err);
  });
});

server.on('error', (error) => {
  console.error('[ECHO-SERVER] Server error:', error);
  process.exit(1);
});

server.listen(SOCKET_PATH, () => {
  console.log('[ECHO-SERVER] Server listening on', SOCKET_PATH);
  console.log('[ECHO-SERVER] Ready to accept connections');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[ECHO-SERVER] Shutting down...');
  server.close();
  if (fs.existsSync(SOCKET_PATH)) {
    fs.unlinkSync(SOCKET_PATH);
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[ECHO-SERVER] Received SIGTERM, shutting down...');
  server.close();
  if (fs.existsSync(SOCKET_PATH)) {
    fs.unlinkSync(SOCKET_PATH);
  }
  process.exit(0);
});
