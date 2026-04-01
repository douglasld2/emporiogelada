import { sql } from "drizzle-orm";
import { db } from "./db";

export async function initializeDatabase() {
  try {
    console.log("[DB] Initializing database tables...");
    
    // Criar extensão UUID se não existir
    await db.execute(
      sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`
    );
    
    console.log("[DB] Database initialized successfully");
  } catch (error) {
    console.error("[DB] Initialization error:", error);
  }
}
