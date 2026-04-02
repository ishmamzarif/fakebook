const pool = require('./db/db');
require('dotenv').config();

async function run() {
  const res = await pool.query("SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_name LIKE 'trg_%'");
  console.table(res.rows);
  process.exit();
}
run();
