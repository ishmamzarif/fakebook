require("dotenv").config();
const pool = require("./db/db");

async function verifyDb() {
  console.log("--- Verifying Database Functions ---");
  try {
    const functions = [
      "accept_friend_request",
      "get_friend_status",
      "delete_user_account",
      "get_unread_notifications_count"
    ];

    for (const fn of functions) {
      const res = await pool.query(
        "SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = $1",
        [fn]
      );
      if (res.rowCount > 0) {
        console.log(`✅ Function ${fn} exists.`);
      } else {
        console.log(`❌ Function ${fn} MISSING!`);
      }
    }
  } catch (err) {
    console.error("Database Verification Error:", err.message);
  } finally {
    process.exit();
  }
}

verifyDb();
