import { pool } from "./server/db";

async function test() {
  try {
    console.log("Testando conexão com timeout de 5s...");
    const client = await Promise.race([
      pool.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Connection timeout")), 5000)
      )
    ]);
    console.log("✓ Conexão bem-sucedida!");
    client.release();
    process.exit(0);
  } catch (err: any) {
    console.error("✗ Erro de conexão:", err.message);
    process.exit(1);
  }
}

test();
