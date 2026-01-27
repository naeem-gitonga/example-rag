import { IncomingMessage } from "http";
import WebSocket from "ws";
import { handleMessage } from "./messageHandler.js";

export function connectionHandler(socket: WebSocket, request: IncomingMessage): void {
  const client = request.socket.remoteAddress ?? "unknown";
  const sessionId = Math.random().toString(36).substring(2, 9);

  console.log(`[gateway] connected ${client} (session: ${sessionId})`);

  // Send welcome message with session ID
  socket.send(JSON.stringify({ type: "connected", sessionId }));

  // Handle incoming messages
  socket.on("message", (data: WebSocket.RawData) => {
    handleMessage(socket, sessionId, data);
  });

  // Handle disconnection
  socket.on("close", () => {
    console.log(`[gateway] disconnected ${client} (session: ${sessionId})`);
  });

  // Handle errors
  socket.on("error", (error: Error) => {
    console.error(`[gateway] error for session ${sessionId}:`, error.message);
  });
}
