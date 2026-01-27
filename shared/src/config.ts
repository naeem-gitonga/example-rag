export const TABLE_NAME = "journal_entries";
export const VECTOR_DIMENSION = 1024; // all-MiniLM-L6-v2 outputs 384 dimensions

export interface AppConfig {
  lancedbUri: string;
  s3Endpoint: string;
  s3AllowHttp: boolean;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsRegion: string;
  embeddingServiceUrl: string;
  mongoUri: string;
  mongoDbName: string;
}

export function loadConfig(): AppConfig {
  // Allow HTTP for local development with MinIO (default: true for local, false for production)
  const s3Endpoint = process.env.S3_ENDPOINT ?? "http://localhost:9000";
  const s3AllowHttp = process.env.S3_ALLOW_HTTP
    ? process.env.S3_ALLOW_HTTP === "true"
    : s3Endpoint.startsWith("http://");

  return {
    lancedbUri: process.env.LANCEDB_URI ?? "s3://lancedb/journal",
    s3Endpoint,
    s3AllowHttp,
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "minioadmin",
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "minioadmin",
    awsRegion: process.env.AWS_REGION ?? "us-east-1",
    embeddingServiceUrl: process.env.EMBEDDING_SERVICE_URL ?? "http://localhost:8001",
    mongoUri: process.env.MONGO_URI ?? "mongodb://root:example@mongo:27017",
    mongoDbName: process.env.MONGO_DB_NAME ?? "example_rag",
  };
}
