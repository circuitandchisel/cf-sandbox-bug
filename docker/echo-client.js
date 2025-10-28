#!/usr/bin/env node
/**
 * Minimal UDS Echo Client
 * Connects to the echo server, sends a message, and prints the response
 */

const net = require('net');
const os = require('os');
const path = require('path');

const SOCKET_PATH = path.join(os.tmpdir(), 'echo-server.sock');

// Get message from command line arguments
const message = process.argv.slice(2).join(' ');

if (!message) {
  console.error('[ECHO-CLIENT] Usage: node echo-client.js <message>');
  console.error('[ECHO-CLIENT] Example: node echo-client.js "Hello World"');
  process.exit(1);
}

console.log('[ECHO-CLIENT] Connecting to:', SOCKET_PATH);
console.log('[ECHO-CLIENT] Sending message:', message);

let response = '';

const client = net.createConnection(SOCKET_PATH, () => {
  console.log('[ECHO-CLIENT] Connected to server');
  // Send message with newline delimiter
  client.write(message + '\n');
  console.log('[ECHO-CLIENT] Message sent');
});

client.on('data', (data) => {
  const chunk = data.toString();
  console.log('[ECHO-CLIENT] Received data:', chunk.trim());
  // Write to stdout for Cloudflare to capture
  process.stdout.write(chunk);
  response += chunk;
  client.end();
});

client.on('end', () => {
  console.log('[ECHO-CLIENT] Connection closed by server');
  process.exit(0);
});

client.on('error', (err) => {
  console.error('[ECHO-CLIENT] Error:', err.message);
  if (err.code === 'ENOENT') {
    console.error('[ECHO-CLIENT] Server is not running at', SOCKET_PATH);
  }
  process.exit(1);
});

// Timeout after 5 seconds
setTimeout(() => {
  console.error('[ECHO-CLIENT] Timeout waiting for response');
  client.destroy();
  process.exit(1);
}, 5000);
