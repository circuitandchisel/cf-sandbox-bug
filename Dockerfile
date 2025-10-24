FROM docker.io/cloudflare/sandbox:0.4.3

# Copy minimal UDS echo server, client, HTTP server, and startup script
COPY docker/echo-server.js /sandbox/echo-server.js
COPY docker/echo-client.js /sandbox/echo-client.js
COPY docker/http-server.js /sandbox/http-server.js
COPY docker/start.sh /sandbox/start.sh

# Make them executable
RUN chmod +x /sandbox/echo-server.js /sandbox/echo-client.js /sandbox/http-server.js /sandbox/start.sh

# Start both the echo server and HTTP health check server
CMD ["/sandbox/start.sh"]
