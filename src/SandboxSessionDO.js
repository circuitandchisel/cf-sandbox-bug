/**
 * Minimal Durable Object for testing WebSocket + Sandbox + UDS
 *
 * Test flow:
 * 1. WebSocket client connects and sends a message
 * 2. DO receives message via webSocketMessage()
 * 3. DO uses UDS client to send message to UDS server in sandbox
 * 4. UDS server echoes message back through UDS
 * 5. DO receives echo and sends back to WebSocket client
 */

import { parseSSEStream, getSandbox } from '@cloudflare/sandbox';

// Hard-coded sandbox ID - no uploads needed
const SANDBOX_ID = 'test-sandbox-fixed-id';

export class SandboxSessionDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
  }

  async fetch(request) {
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    // Create WebSocket pair
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];

    // Accept the WebSocket connection
    this.state.acceptWebSocket(server);

    // Store minimal session metadata
    this.sessions.set(server, {
      sandboxId: SANDBOX_ID,
      connectedAt: Date.now(),
    });

    console.log(`[WS-MINIMAL] Client connected, will use sandbox: ${SANDBOX_ID}`);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(ws, message) {
    console.log('[WS-MINIMAL] Received message from client:', message.substring(0, 100));

    try {
      const session = this.sessions.get(ws);
      if (!session) {
        console.error('[WS-MINIMAL] No session found');
        ws.send(JSON.stringify({ type: 'error', error: 'No session found' }));
        return;
      }

      // Parse message
      let data;
      try {
        data = JSON.parse(message);
      } catch (parseError) {
        console.error('[WS-MINIMAL] Failed to parse JSON:', parseError);
        ws.send(JSON.stringify({ type: 'error', error: 'Invalid JSON' }));
        return;
      }

      if (data.type === 'ping') {
        console.log('[WS-MINIMAL] Responding to ping');
        ws.send(JSON.stringify({ type: 'pong' }));
        return;
      }

      if (data.type === 'message') {
        console.log('[WS-MINIMAL] Processing user message:', data.message);
        await this.sendToSandbox(ws, session, data.message);
        return;
      }

      console.log('[WS-MINIMAL] Unknown message type:', data.type);
      ws.send(JSON.stringify({ type: 'error', error: 'Unknown message type' }));

    } catch (error) {
      console.error('[WS-MINIMAL] Error in webSocketMessage:', error);
      ws.send(JSON.stringify({ type: 'error', error: error.message }));
    }
  }

  async sendToSandbox(ws, session, userMessage) {
    console.log('[WS-MINIMAL] sendToSandbox called');

    try {
      // Get the sandbox instance with hard-coded ID
      console.log('[WS-MINIMAL] Getting sandbox:', session.sandboxId);
      const sandbox = getSandbox(this.env.SANDBOX, session.sandboxId);
      console.log('[WS-MINIMAL] Sandbox obtained');

      // Use the UDS client to send message to the UDS echo server
      // The echo-client.js connects to the echo-server.js via UDS
      const command = `node /sandbox/echo-client.js "${userMessage.replace(/"/g, '\\"')}"`;
      console.log('[WS-MINIMAL] Starting process with command:', command);

      const process = await sandbox.startProcess(command);
      console.log('[WS-MINIMAL] Process started, ID:', process.id);

      console.log('[WS-MINIMAL] Getting process stream');
      const execStream = await sandbox.streamProcessLogs(process.id);
      console.log('[WS-MINIMAL] Got execStream, parsing SSE');

      // Stream the output back to client
      for await (const event of parseSSEStream(execStream)) {
        console.log('[WS-MINIMAL] Event from sandbox:', event.type, event.data?.substring(0, 100));

        switch (event.type) {
          case 'stdout':
          case 'stderr':
            if (event.data) {
              ws.send(JSON.stringify({
                type: 'output',
                data: event.data,
              }));
            }
            break;

          case 'complete':
            console.log(`[WS-MINIMAL] Process completed with exit code: ${event.exitCode}`);
            ws.send(JSON.stringify({
              type: 'complete',
              exitCode: event.exitCode,
            }));
            break;

          case 'error':
            console.error(`[WS-MINIMAL] Process error: ${event.error}`);
            ws.send(JSON.stringify({
              type: 'error',
              error: event.error,
            }));
            break;
        }
      }

      console.log('[WS-MINIMAL] Stream completed');
    } catch (error) {
      console.error('[WS-MINIMAL] Error in sendToSandbox:', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: error.message,
      }));
    }
  }

  async webSocketClose(ws, code, reason, wasClean) {
    const session = this.sessions.get(ws);
    if (session) {
      console.log(`[WS-MINIMAL] Client disconnected from sandbox ${session.sandboxId}`);
      this.sessions.delete(ws);
    }
  }

  async webSocketError(ws, error) {
    console.error('[WS-MINIMAL] WebSocket error:', error);
    this.sessions.delete(ws);
  }
}
