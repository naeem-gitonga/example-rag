import { MongoClient, Db } from "mongodb";
import { loadConfig } from "../config";

const config = loadConfig();

let client: MongoClient | null = null;
let db: Db | null = null;

export async function initMongoConnection(
  mongoClientDep: typeof MongoClient = MongoClient
): Promise<Db> {
  if (db) {
    return db;
  }

  console.log(`Connecting to MongoDB at: ${config.mongoUri}`);
  client = new mongoClientDep(config.mongoUri);
  await client.connect();
  db = client.db(config.mongoDbName);
  console.log(`MongoDB connection established to database: ${config.mongoDbName}`);

  return db;
}

export async function getMongoDb(
  mongoClientDep: typeof MongoClient = MongoClient
): Promise<Db> {
  if (db) {
    return db;
  }
  return initMongoConnection(mongoClientDep);
}

export async function closeMongoConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log("MongoDB connection closed");
  }
}

export function resetMongoConnection(): void {
  client = null;
  db = null;
}
