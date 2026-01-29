import { connect, Connection, Table } from "@lancedb/lancedb";
import { loadConfig, TABLE_NAME, VECTOR_DIMENSION } from "../config";
import { DocumentEntry } from "../types";

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
      ...(config.s3AllowHttp && { allowHttp: "true" }),
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
    // Create table with a placeholder record to establish schema
    // LanceDB requires at least one record or a schema to create a table
    const placeholderEntry: DocumentEntry = {
      id: "__placeholder__",
      entry_id: "",
      entry_date: "1970-01-01",
      chunk_index: 0,
      text: "__placeholder__",
      vector: new Array(VECTOR_DIMENSION).fill(0),
      topics: ["__placeholder__"],  // Non-empty array for type inference
      word_count: 0,
    };
    table = await db.createTable(TABLE_NAME, [placeholderEntry]);
    // Delete the placeholder record
    await table.delete('id = "__placeholder__"');
    console.log(`Table ${TABLE_NAME} created with schema`);
  } else {
    throw new Error(`Table ${TABLE_NAME} does not exist. Ingest data first.`);
  }

  return table;
}

export function resetConnection(): void {
  connection = null;
  table = null;
}
