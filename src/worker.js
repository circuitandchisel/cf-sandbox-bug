/**
 * Minimal Cloudflare Worker for reproducing WebSocket/Sandbox bug
 */

// Export Sandbox Durable Object from @cloudflare/sandbox
export { Sandbox } from '@cloudflare/sandbox';

// Export our minimal SandboxSession Durable Object
export { SandboxSessionDO } from './SandboxSessionDO.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // WebSocket endpoint: /ws
    if (pathname === '/ws' && request.method === 'GET') {
      const upgradeHeader = request.headers.get('Upgrade');
      if (upgradeHeader !== 'websocket') {
        return new Response('Expected WebSocket upgrade', { status: 426 });
      }

      // Get the SandboxSession Durable Object with hard-coded ID
      const sessionId = env.SANDBOX_SESSION.idFromName('test-session');
      const sessionStub = env.SANDBOX_SESSION.get(sessionId);

      console.log('[WORKER] Forwarding WebSocket upgrade to SandboxSessionDO');
      return await sessionStub.fetch(request);
    }

    // Simple health check
    if (pathname === '/' || pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', message: 'Minimal reproduction worker' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not found', { status: 404 });
  },
};
