import { jest, describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import { loadConfig, TABLE_NAME, VECTOR_DIMENSION } from "./config";

describe("config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("constants", () => {
    it("should have correct TABLE_NAME", () => {
      expect(TABLE_NAME).toBe("document_entries");
    });

    it("should have correct VECTOR_DIMENSION", () => {
      expect(VECTOR_DIMENSION).toBe(1024);
    });
  });

  describe("loadConfig", () => {
    it("should return default values when env vars are not set", () => {
      delete process.env.LANCEDB_URI;
      delete process.env.S3_ENDPOINT;
      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_SECRET_ACCESS_KEY;
      delete process.env.AWS_REGION;
      delete process.env.EMBEDDING_SERVICE_URL;

      const config = loadConfig();

      expect(config.lancedbUri).toBe("s3://lancedb/documents");
      expect(config.s3Endpoint).toBe("http://localhost:9000");
      expect(config.awsAccessKeyId).toBe("minioadmin");
      expect(config.awsSecretAccessKey).toBe("minioadmin");
      expect(config.awsRegion).toBe("us-east-1");
      expect(config.embeddingServiceUrl).toBe("http://localhost:8001");
    });

    it("should use env vars when set", () => {
      process.env.LANCEDB_URI = "s3://my-bucket/data";
      process.env.S3_ENDPOINT = "http://minio:9000";
      process.env.AWS_ACCESS_KEY_ID = "mykey";
      process.env.AWS_SECRET_ACCESS_KEY = "mysecret";
      process.env.AWS_REGION = "us-west-2";
      process.env.EMBEDDING_SERVICE_URL = "http://embedding:8001";

      const config = loadConfig();

      expect(config.lancedbUri).toBe("s3://my-bucket/data");
      expect(config.s3Endpoint).toBe("http://minio:9000");
      expect(config.awsAccessKeyId).toBe("mykey");
      expect(config.awsSecretAccessKey).toBe("mysecret");
      expect(config.awsRegion).toBe("us-west-2");
      expect(config.embeddingServiceUrl).toBe("http://embedding:8001");
    });
  });
});
