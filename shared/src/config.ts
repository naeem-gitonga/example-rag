export const TABLE_NAME = "journal_entries";
export const VECTOR_DIMENSION = 384; // all-MiniLM-L6-v2 outputs 384 dimensions

export interface AppConfig {
  lancedbUri: string;
  s3Endpoint: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsRegion: string;
  embeddingServiceUrl: string;
}

export function loadConfig(): AppConfig {
  return {
    lancedbUri: process.env.LANCEDB_URI ?? "s3://lancedb/journal",
    s3Endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "minioadmin",
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "minioadmin",
    awsRegion: process.env.AWS_REGION ?? "us-east-1",
    embeddingServiceUrl: process.env.EMBEDDING_SERVICE_URL ?? "http://localhost:8001",
  };
}
