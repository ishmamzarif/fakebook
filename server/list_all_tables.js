require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
    try {
        const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log("Tables found:", res.rows.map(r => r.table_name));
        process.exit();
    } catch (err) {
        console.error("Failed to list tables:", err.message);
        process.exit(1);
    }
}
run();
