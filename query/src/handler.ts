import { APIGatewayProxyResult } from "aws-lambda";
import { search } from "./services/query.service";
import { QueryEvent, QueryBody } from "@shared/types";
import { initConnection } from "@shared/db/connection";

// Initialize database connection on cold start
const dbConnectionPromise = initConnection().catch((error) => {
  console.error("Failed to initialize database connection on cold start:", error);
  return null;
});

/**
 * Main Lambda handler
 * Routes incoming requests to appropriate service functions
 */
export const handler = async (event: QueryEvent): Promise<APIGatewayProxyResult> => {
  // Ensure database connection is established
  await dbConnectionPromise;

  try {
    const body: QueryBody =
      typeof event.body === "string" ? JSON.parse(event.body) : event.body || {};
    const action = event.action || body.action;

    switch (action) {
      case "query":
        return await search(body);

      case "health":
        return {
          statusCode: 200,
          body: JSON.stringify({ status: "ok", service: "query" }),
        };

      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Invalid action. Use: query, health" }),
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
