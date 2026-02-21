import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/future_express";

const isNeon = connectionString.includes("neon.tech");

const client = postgres(connectionString, {
  max: isNeon ? 3 : 10,            // Neon free-tier pooler is strict
  idle_timeout: 20,                 // Close idle connections after 20s
  connect_timeout: 15,              // 15s connect timeout
  ...(isNeon && { ssl: "require" }), // Neon requires SSL
});
export const db = drizzle(client, { schema });

export * from "./schema";
