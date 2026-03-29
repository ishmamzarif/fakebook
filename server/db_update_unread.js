require("dotenv").config();
const pool = require("./db/db");

async function update() {
  try {
    const res = await pool.query(`
      ALTER TABLE conversation_members 
      ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log("Database updated successfully: last_read_at added to conversation_members.");
  } catch (err) {
    console.error("Error updating database:", err);
  } finally {
    process.exit();
  }
}
update();
