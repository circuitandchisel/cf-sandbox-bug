#!/usr/bin/env node
/**
 * Test script for minimal WebSocket reproduction
 * Tests the flow: WebSocket → Worker → SandboxSessionDO → Sandbox → UDS Client → UDS Server → Echo back
 */

import WebSocket from 'ws';

const WORKER_URL = process.env.WORKER_URL || 'ws://localhost:8787';

console.log('=== Minimal WebSocket Echo Test ===');
console.log('Worker URL:', WORKER_URL);
console.log('');

function connectAndTest() {
  return new Promise((resolve, reject) => {
    const wsUrl = `${WORKER_URL}/ws`;
    console.log('Connecting to:', wsUrl);

    const ws = new WebSocket(wsUrl);
    let testComplete = false;

    // Timeout after 30 seconds
    const timeout = setTimeout(() => {
      if (!testComplete) {
        console.error('❌ Test timed out after 30 seconds');
        ws.close();
        reject(new Error('Test timeout'));
      }
    }, 30000);

    ws.on('open', () => {
      console.log('✓ WebSocket connected');
      console.log('');

      // Send a test message
      const testMessage = {
        type: 'message',
        message: 'Hello from minimal test!',
      };

      console.log('Sending test message:', testMessage.message);
      ws.send(JSON.stringify(testMessage));
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      console.log('Received:', message);

      if (message.type === 'output') {
        console.log('📝 Output:', message.data);
      } else if (message.type === 'complete') {
        console.log('✓ Process completed with exit code:', message.exitCode);
        testComplete = true;
        clearTimeout(timeout);
        ws.close();
        resolve();
      } else if (message.type === 'error') {
        console.error('❌ Error:', message.error);
        clearTimeout(timeout);
        ws.close();
        reject(new Error(message.error));
      }
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      clearTimeout(timeout);
      reject(error);
    });

    ws.on('close', (code, reason) => {
      console.log('WebSocket closed:', code, reason.toString());
      if (!testComplete) {
        reject(new Error('Connection closed before test completed'));
      }
    });
  });
}

// Run the test
(async () => {
  try {
    await connectAndTest();
    console.log('');
    console.log('✓ Test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
})();
