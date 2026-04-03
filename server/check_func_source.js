require("dotenv").config();
const { Pool } = require("pg");
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkFuncSource() {
    try {
        const res = await pool.query(`
            SELECT 
                prosrc AS source
            FROM pg_proc
            JOIN pg_namespace n ON pg_proc.pronamespace = n.oid
            WHERE proname = 'log_flagged_content' AND n.nspname = 'public';
        `);
        console.log(res.rows[0].source);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
checkFuncSource();
