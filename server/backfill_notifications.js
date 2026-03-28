require("dotenv").config({ path: "./server/.env" });
const pool = require("./db/db");

async function backfill() {
  try {
    console.log("Backfilling related_user_id for notifications...");
    
    // For friend_request notifications: 
    // related_user_id should be fr.sender_id where n.reference_id = fr.request_id
    await pool.query(`
      UPDATE notifications n
      SET related_user_id = fr.sender_id
      FROM friend_requests fr
      WHERE n.type = 'friend_request' 
      AND n.reference_id = fr.request_id 
      AND n.related_user_id IS NULL;
    `);

    // For friend_request_accepted notifications:
    // related_user_id should be fr.receiver_id where n.reference_id = fr.request_id
    await pool.query(`
      UPDATE notifications n
      SET related_user_id = fr.receiver_id
      FROM friend_requests fr
      WHERE n.type = 'friend_request_accepted' 
      AND n.reference_id = fr.request_id 
      AND n.related_user_id IS NULL;
    `);

    console.log("Backfill complete.");
    process.exit(0);
  } catch (err) {
    console.error("Backfill error:", err);
    process.exit(1);
  }
}

backfill();
