require("dotenv").config();
const { Pool } = require("pg");
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function check() {
    try {
        const res = await pool.query(`
            SELECT 
                tgname AS trigger_name,
                c.relname AS table_name,
                tgenabled AS enabled,
                pg_get_triggerdef(pg_trigger.oid) AS definition
            FROM pg_trigger
            JOIN pg_class c ON pg_trigger.tgrelid = c.oid
            WHERE c.relname = 'posts' AND tgisinternal = false;
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
check();
