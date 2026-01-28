import { APIGatewayProxyResult } from "aws-lambda";
import { ingest, ingestPdf } from "./services/ingestion.service";
import { IngestEvent, IngestBody, IngestPdfBody } from "@shared/types";
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
export const handler = async (event: IngestEvent): Promise<APIGatewayProxyResult> => {
  // Ensure database connection is established
  await dbConnectionPromise;

  try {
    const body: IngestBody | IngestPdfBody =
      typeof event.body === "string" ? JSON.parse(event.body) : event.body || {};
    const action = event.action || body.action;

    switch (action) {
      case "ingest":
        return await ingest(body as IngestBody);

      case "ingest_pdf":
        return await ingestPdf(body as IngestPdfBody);

      case "health":
        return {
          statusCode: 200,
          body: JSON.stringify({ status: "ok", service: "ingestion" }),
        };

      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Invalid action. Use: ingest, ingest_pdf, health" }),
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
