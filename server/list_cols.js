require("dotenv").config();
const pool = require("./db/db");

async function checkSchema() {
  const tables = ["posts", "comments", "stories", "content_media"];
  
  for (const table of tables) {
    console.log(`Checking columns for table: ${table}`);
    try {
      const res = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [table]);
      console.log(`Columns for ${table}:`, res.rows.map(r => r.column_name).join(", "));
    } catch (err) {
      console.error(`Error checking ${table}:`, err);
    }
  }
  process.exit();
}

checkSchema();
