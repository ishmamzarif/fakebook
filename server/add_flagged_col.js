require('dotenv').config();
const pool = require('./db/db');

async function fixDb() {
    try {
        console.log("Adding flagged column to content_media...");
        await pool.query("ALTER TABLE content_media ADD COLUMN IF NOT EXISTS flagged BOOLEAN DEFAULT false;");
        console.log("Successfully added flagged column.");
        process.exit(0);
    } catch (e) {
        console.error("Error modifying db:", e);
        process.exit(1);
    }
}
fixDb();
