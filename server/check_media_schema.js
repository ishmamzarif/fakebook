require('dotenv').config();
const pool = require('./db/db');

async function check() {
  try {
    const res = await pool.query(`
      SELECT column_name, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'content_media'
    `);
    console.log("CONTENT_MEDIA_SCHEMA:" + JSON.stringify(res.rows));
  } catch (err) {
    console.error("SHELL_ERROR:" + err.message);
  } finally {
    await pool.end();
  }
}
check();
