const pool = require("./db/db");
const { checkText, checkImage } = require("./utils/moderation");

async function testPost() {
  const userId = 1; // Assuming user with ID 1 exists
  const caption = "Test post content";
  const visibility = 1;
  const postType = "c";
  const isFlagged = false;

  console.log("Checking DB schema for 'flagged' column...");
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'posts' AND column_name = 'flagged'
    `);
    console.log("Column 'flagged' in 'posts':", res.rows);
    
    const res2 = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'content_media' AND column_name = 'flagged'
    `);
    console.log("Column 'flagged' in 'content_media':", res2.rows);

  } catch (err) {
    console.error("Schema check error:", err);
  }

  console.log("Testing text moderation...");
  try {
    const flagged = await checkText(caption);
    console.log("Moderation result:", flagged);
  } catch (err) {
    console.error("Moderation error:", err);
  }

  process.exit();
}

testPost();
