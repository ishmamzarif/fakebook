const pool = require("./db/db");

async function check() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'content_media';
    `);
    console.log("Schema for content_media:", JSON.stringify(result.rows, null, 2));
  } catch (err) {
    console.error("Error checking schema:", err);
  } finally {
    process.exit();
  }
}
check();
