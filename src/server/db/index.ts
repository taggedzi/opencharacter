// import { drizzle } from "drizzle-orm/d1";
// import * as schema from "./schema";
// export const db = drizzle(process.env.DATABASE, { schema, logger: false });

// Use the better-sqlite3 adapter for local SQLite
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
const path = require("path");
const Database = require("better-sqlite3");

// Path to your local SQLite DB
const dbPath = path.resolve("./local/opencharacter.sqlite");
const sqlite = new Database(dbPath);

export const db = drizzle(sqlite, { schema, logger: false });