require("dotenv").config();
const { Pool } = require("pg");
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function listTriggers() {
    try {
        const res = await pool.query(`
            SELECT 
                tgname AS trigger_name,
                c.relname AS table_name,
                pg_get_triggerdef(t.oid) AS definition
            FROM pg_trigger t
            JOIN pg_class c ON t.tgrelid = c.oid
            JOIN pg_namespace n ON c.relnamespace = n.oid
            WHERE n.nspname = 'public' AND tgisinternal = false;
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
listTriggers();
