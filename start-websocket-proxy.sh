#!/usr/bin/env bash
# Start the Go WebSocket proxy with local dev settings
# Requires: Go proxy already compiled (websocket-proxy/websocket-proxy.exe)
#           Redis running on localhost:6379
#           Java backend running on localhost:8082

cd "$(dirname "$0")/websocket-proxy"
REDIS_ADDR=localhost:6379 \
JWT_SIGNER_KEY="${JWT_SIGNER_KEY:?JWT_SIGNER_KEY is required}" \
BACKEND_URL=http://localhost:8082 \
PORT=8081 \
exec ./websocket-proxy.exe
