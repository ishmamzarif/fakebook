require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const tables = ['posts', 'content_media', 'stories', 'comments'];
  for (let table of tables) {
    try {
      const res = await pool.query(`
        SELECT column_name, is_nullable, column_default 
        FROM information_schema.columns 
        WHERE table_name = '${table}'
      `);
      console.log(`\n--- TABLE: ${table} ---`);
      console.table(res.rows);
    } catch (err) {
      console.error(`ERROR check ${table}:`, err.message);
    }
  }
  await pool.end();
}
check();
