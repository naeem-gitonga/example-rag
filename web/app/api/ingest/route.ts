import { NextRequest, NextResponse } from "next/server";

const INGESTION_LAMBDA_URL =
  process.env.INGESTION_LAMBDA_URL ||
  "http://ingestion:8080/2015-03-31/functions/function/invocations";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(INGESTION_LAMBDA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { error: "Failed to proxy request to ingestion service" },
      { status: 500 }
    );
  }
}
