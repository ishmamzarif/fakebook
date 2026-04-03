require('dotenv').config();
const { Pool } = require('pg');

async function fixNotifications() {
  const connectionString = process.env.DATABASE_URL + (process.env.DATABASE_URL.includes("?") ? "&ssl=true" : "?ssl=true");
  const pool = new Pool({ connectionString });

  try {
    console.log("Checking notifications table for actor_id column...");
    const checkRes = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'notifications' AND column_name = 'actor_id'
    `);

    if (checkRes.rows.length === 0) {
      console.log("Adding actor_id column to notifications table...");
      await pool.query(`
        ALTER TABLE notifications 
        ADD COLUMN actor_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL
      `);
      console.log("Successfully added actor_id column.");
    } else {
      console.log("actor_id column already exists.");
    }

  } catch (err) {
    console.error("Error updating notifications table:", err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

fixNotifications();
