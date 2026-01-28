import { APIGatewayProxyResult } from "aws-lambda";
import { search } from "./services/query.service";
import { rag, saveMessage, getHistory } from "./services/chat.service";
import { QueryEvent, QueryBody, HistoryBody, RagBody, SaveMessageBody } from "@shared/types";
import { initConnection } from "@shared/db/connection";

// Initialize database connection on cold start
const dbConnectionPromise = initConnection().catch((error) => {
  console.error("Failed to initialize database connection on cold start:", error);
  return null;
});

type RequestBody = QueryBody | HistoryBody | RagBody | SaveMessageBody;

/**
 * Main Lambda handler
 * Routes incoming requests to appropriate service functions
 */
export const handler = async (event: QueryEvent): Promise<APIGatewayProxyResult> => {
  // Ensure database connection is established
  await dbConnectionPromise;

  try {
    const body: RequestBody =
      typeof event.body === "string" ? JSON.parse(event.body) : event.body || {};
    const action = event.action || body.action;

    switch (action) {
      case "query":
        return await search(body as QueryBody);

      case "rag":
        return await rag(body as RagBody);

      case "save_message":
        return await saveMessage(body as SaveMessageBody);

      case "history":
        return await getHistory(body as HistoryBody);

      case "health":
        return {
          statusCode: 200,
          body: JSON.stringify({ status: "ok", service: "query" }),
        };

      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Invalid action. Use: query, rag, save_message, history, health" }),
        };
    }
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error", message: errorMessage }),
    };
  }
};
