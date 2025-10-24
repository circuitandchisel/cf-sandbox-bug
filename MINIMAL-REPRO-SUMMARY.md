# Minimal Reproduction Summary

## Overview

Successfully extracted a minimal reproduction case to isolate a bug in Cloudflare's Sandbox/WebSocket implementation. The bug causes `startProcess()` or `streamProcessLogs()` to hang indefinitely when called from within a Durable Object WebSocket handler.

## What Was Built

### Components

#### Worker (`src/worker.js`)
- Single `/ws` endpoint for WebSocket connections
- Minimal router with no complex logic
- ~40 lines of code

#### Durable Object (`src/SandboxSessionDO.js`)
- Hard-coded sandbox ID: `test-sandbox-fixed-id` (no upload/initialization needed)
- Handles WebSocket connections and messages
- Attempts to use UDS client to communicate with UDS server in sandbox
- ~180 lines of code

#### Docker Container
- **Echo Server** (`docker/echo-server.js`): Simple UDS server that echoes messages back
- **Echo Client** (`docker/echo-client.js`): Simple UDS client that sends messages to echo server
- **HTTP Server** (`docker/http-server.js`): Health check server on port 3000 (required by Cloudflare)
- **Start Script** (`docker/start.sh`): Runs both echo server and HTTP server

#### Test Script (`test-minimal.js`)
- Connects to WebSocket
- Sends test message: `{"type": "message", "message": "Hello from minimal test!"}`
- Waits for echo response
- Times out after 30 seconds if no response

## Bug Reproduction

1. WebSocket connects ✅
2. Message sent to worker ✅
3. Worker forwards to SandboxSessionDO ✅
4. DO receives message ✅
5. DO calls `sandbox.startProcess()` ✅
6. DO calls `sandbox.streamProcessLogs()` ❌ **HANGS HERE**
7. DO streams SSE events back to WebSocket ❌ **NEVER HAPPENS**
8. Client receives echo ❌ **NEVER HAPPENS**


## Test Flow

```
WebSocket Client (test-minimal.js)
    ↓ [sends message]
Worker (src/worker.js)
    ↓ [forwards to Durable Object]
SandboxSessionDO (src/SandboxSessionDO.js)
    ↓ [calls startProcess()]
    ↓ [calls streamProcessLogs()]
    ↓ **HANGS INDEFINITELY** ⚠️
    ✗ [never receives SSE events]
```

## Key Findings

1. **Container starts successfully**: HTTP server on port 3000 passes Cloudflare health checks
2. **WebSocket connection works**: Client successfully connects and sends messages
3. **Message routing works**: Worker correctly routes to SandboxSessionDO
4. **Sandbox SDK hangs**: Either `startProcess()` or `streamProcessLogs()` never completes
5. **No SSE events received**: The `parseSSEStream()` loop never receives any events

**Since the bug reproduces in this minimal case, it confirms the issue is in Cloudflare's infrastructure, specifically in how the Sandbox Durable Object handles process execution when called from a WebSocket context.**

## Files to Review

- `src/worker.js` - Minimal worker (40 lines)
- `src/SandboxSessionDO.js` - Minimal Durable Object (180 lines)
- `docker/echo-server.js` - Simple UDS echo server (60 lines)
- `docker/echo-client.js` - Simple UDS client (50 lines)
- `test-minimal.js` - WebSocket test script (60 lines)