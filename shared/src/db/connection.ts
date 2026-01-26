import { connect, Connection, Table } from "@lancedb/lancedb";
import { loadConfig, TABLE_NAME } from "../config";
import { JournalEntry } from "../types";

const config = loadConfig();

let connection: Connection | null = null;
let table: Table | null = null;

export async function initConnection(connectDep = connect): Promise<Connection> {
  if (connection) {
    return connection;
  }

  console.log(`Connecting to LanceDB at: ${config.lancedbUri}`);
  connection = await connectDep(config.lancedbUri, {
    storageOptions: {
      awsAccessKeyId: config.awsAccessKeyId,
      awsSecretAccessKey: config.awsSecretAccessKey,
      awsEndpoint: config.s3Endpoint,
      awsRegion: config.awsRegion,
    },
  });
  console.log("LanceDB connection established");

  return connection;
}

export async function getTable(
  createIfMissing: boolean = false,
  connectDep = connect
): Promise<Table> {
  if (table) {
    return table;
  }

  const db = await initConnection(connectDep);
  const tables = await db.tableNames();

  if (tables.includes(TABLE_NAME)) {
    console.log(`Opening existing table: ${TABLE_NAME}`);
    table = await db.openTable(TABLE_NAME);
  } else if (createIfMissing) {
    console.log(`Creating new table: ${TABLE_NAME}`);
    const emptyData: JournalEntry[] = [];
    table = await db.createTable(TABLE_NAME, emptyData);
  } else {
    throw new Error(`Table ${TABLE_NAME} does not exist. Ingest data first.`);
  }

  return table;
}

export function resetConnection(): void {
  connection = null;
  table = null;
}
