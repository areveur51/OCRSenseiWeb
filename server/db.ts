import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure connection pool for serverless environment
// Handle Neon's 5-minute idle timeout by using shorter idle timeout and connection pooler
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 60000, // Close idle clients after 1 minute (before Neon's 5-min timeout)
  connectionTimeoutMillis: 10000, // Timeout for new connections
});

// Handle pool errors gracefully
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

export { pool };
export const db = drizzle({ client: pool, schema });
