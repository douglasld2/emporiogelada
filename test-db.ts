import { Pool } from 'pg';

async function testConnection() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    statement_timeout: 5000,
  });

  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✓ Conexão OK:', result.rows[0]);
    
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('✓ Tabelas:', tables.rows.length ? tables.rows.map(t => t.table_name) : 'nenhuma');
    
    pool.end();
  } catch (err: any) {
    console.error('✗ Erro:', err.message);
    pool.end();
  }
}

testConnection();
