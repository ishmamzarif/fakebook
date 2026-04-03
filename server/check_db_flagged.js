require("dotenv").config();
const { Pool } = require("pg");

async function checkDb() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL + (process.env.DATABASE_URL.includes("?") ? "&ssl=true" : "?ssl=true"),
  });

  try {
    const resPosts = await pool.query("SELECT post_id, caption, flagged FROM posts ORDER BY created_at DESC LIMIT 5");
    console.log("Last 5 Posts Flagged State:");
    console.table(resPosts.rows);

    const resComments = await pool.query("SELECT comment_id, content, flagged FROM comments ORDER BY created_at DESC LIMIT 5");
    console.log("\nLast 5 Comments Flagged State:");
    console.table(resComments.rows);

  } catch (err) {
    console.error("Database connection error:", err.message);
  } finally {
    await pool.end();
  }
}

checkDb();
