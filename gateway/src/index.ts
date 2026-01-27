import http from "http";
import { WebSocketServer } from "ws";
import { connectionHandler } from "./handlers/connectionHandler.js";

const port = Number(process.env.GATEWAY_PORT ?? 8080);

// Create HTTP server for health checks
const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "gateway" }));
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found - connect via WebSocket at /ws");
});

// Create WebSocket server
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", connectionHandler);

server.listen(port, () => {
  console.log(`[gateway] running on http://localhost:${port}`);
  console.log(`[gateway] WebSocket endpoint: ws://localhost:${port}/ws`);
});
