require('dotenv').config();
const pool = require('./db/db');

async function test() {
    const res = await pool.query("SELECT event_object_table, trigger_name FROM information_schema.triggers WHERE action_statement LIKE '%log_flagged_content%'");
    require('fs').writeFileSync("out.json", JSON.stringify(res.rows, null, 2));
    process.exit(0);
}
test();
