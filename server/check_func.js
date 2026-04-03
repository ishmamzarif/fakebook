require('dotenv').config();
const pool = require('./db/db');

async function test() {
    try {
        const res = await pool.query("SELECT to_regclass('public.content_moderation')");
        require('fs').writeFileSync('func.txt', JSON.stringify(res.rows));
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
test();
