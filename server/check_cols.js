require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    const res = await pool.query("SELECT * FROM posts LIMIT 0");
    console.log("POSTS_COLUMNS:" + res.fields.map(f => f.name).join(","));
    
    const res2 = await pool.query("SELECT * FROM content_media LIMIT 0");
    console.log("MEDIA_COLUMNS:" + res2.fields.map(f => f.name).join(","));
  } catch (err) {
    console.error("SHELL_ERROR:" + err.message);
  } finally {
    await pool.end();
  }
}
check();
