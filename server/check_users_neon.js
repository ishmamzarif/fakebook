require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users';", (err, res) => {
  if (err) { console.error('Error:', err); }
  else { console.log(JSON.stringify(res.rows, null, 2)); }
  pool.end();
});
