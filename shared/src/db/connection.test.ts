import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { initConnection, getTable, resetConnection } from "./connection";
import { TABLE_NAME } from "../config";

// Mock the lancedb module
const mockTable = {
  add: jest.fn<any>(),
  search: jest.fn<any>(),
};

const mockConnection = {
  tableNames: jest.fn<any>(),
  openTable: jest.fn<any>(),
  createTable: jest.fn<any>(),
};

const mockConnect = jest.fn<any>();

describe("connection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetConnection();
    mockConnect.mockResolvedValue(mockConnection);
    mockConnection.openTable.mockResolvedValue(mockTable);
    mockConnection.createTable.mockResolvedValue(mockTable);
  });

  describe("initConnection", () => {
    it("should create a new connection on first call", async () => {
      const connection = await initConnection(mockConnect as any);

      expect(mockConnect).toHaveBeenCalledTimes(1);
      expect(connection).toBe(mockConnection);
    });

    it("should return cached connection on subsequent calls", async () => {
      await initConnection(mockConnect as any);
      await initConnection(mockConnect as any);

      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    it("should pass correct storage options to connect", async () => {
      await initConnection(mockConnect as any);

      expect(mockConnect).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          storageOptions: expect.objectContaining({
            awsAccessKeyId: expect.any(String),
            awsSecretAccessKey: expect.any(String),
            awsEndpoint: expect.any(String),
            awsRegion: expect.any(String),
          }),
        })
      );
    });
  });

  describe("getTable", () => {
    it("should open existing table when it exists", async () => {
      mockConnection.tableNames.mockResolvedValue([TABLE_NAME]);

      const table = await getTable(false, mockConnect as any);

      expect(mockConnection.tableNames).toHaveBeenCalled();
      expect(mockConnection.openTable).toHaveBeenCalledWith(TABLE_NAME);
      expect(table).toBe(mockTable);
    });

    it("should throw error when table does not exist and createIfMissing is false", async () => {
      mockConnection.tableNames.mockResolvedValue([]);

      await expect(getTable(false, mockConnect as any)).rejects.toThrow(
        `Table ${TABLE_NAME} does not exist`
      );
    });

    it("should create table when it does not exist and createIfMissing is true", async () => {
      mockConnection.tableNames.mockResolvedValue([]);

      const table = await getTable(true, mockConnect as any);

      expect(mockConnection.createTable).toHaveBeenCalledWith(TABLE_NAME, []);
      expect(table).toBe(mockTable);
    });

    it("should return cached table on subsequent calls", async () => {
      mockConnection.tableNames.mockResolvedValue([TABLE_NAME]);

      await getTable(false, mockConnect as any);
      await getTable(false, mockConnect as any);

      expect(mockConnection.openTable).toHaveBeenCalledTimes(1);
    });
  });

  describe("resetConnection", () => {
    it("should clear cached connection and table", async () => {
      mockConnection.tableNames.mockResolvedValue([TABLE_NAME]);

      await initConnection(mockConnect as any);
      await getTable(false, mockConnect as any);

      resetConnection();

      await initConnection(mockConnect as any);

      expect(mockConnect).toHaveBeenCalledTimes(2);
    });
  });
});
