const pool = require("./db/db");

async function check() {
  const result = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'friends';
  `);
  console.log("Columns:", result.rows);
  
  const constraints = await pool.query(`
    SELECT c.conname, c.contype, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conrelid::regclass::text = 'friends';
  `);
  console.log("Constraints:", constraints.rows);

  const indexDefs = await pool.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'friends';
  `);
  console.log("Indexes:", indexDefs.rows);
  
  process.exit();
}
check();
