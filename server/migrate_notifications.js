require("dotenv").config({ path: "./server/.env" });
const pool = require("./db/db");



async function migrate() {
  try {
    console.log("Adding is_read to notifications...");
    await pool.query("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;");
    console.log("Column is_read added successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

migrate();

