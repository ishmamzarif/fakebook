require('dotenv').config();
const pool = require('./db/db');

async function check() {
    try {
        console.log("Checking triggers on relevant tables...");
        const res = await pool.query(`
            SELECT trigger_name, event_manipulation, event_object_table, action_statement 
            FROM information_schema.triggers 
            WHERE event_object_table IN ('messages', 'comments', 'comment_replies', 'likes', 'posts', 'post_tags');
        `);
        
        if (res.rows.length === 0) {
            console.log("No triggers found on these tables!");
        } else {
            console.table(res.rows);
        }

        console.log("\nChecking notify functions...");
        const funcRes = await pool.query(`
            SELECT routine_name 
            FROM information_schema.routines 
            WHERE routine_type = 'FUNCTION' 
              AND routine_schema = 'public'
              AND routine_name LIKE 'notify_%';
        `);
        console.table(funcRes.rows);

        process.exit();
    } catch (err) {
        console.error("Error checking triggers:", err.message);
        process.exit(1);
    }
}

check();
