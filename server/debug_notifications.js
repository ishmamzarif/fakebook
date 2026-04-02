require('dotenv').config();
const pool = require('./db/db');

async function run() {
    // Check is_seen states on new notifications
    const res = await pool.query(`
        SELECT 
            type,
            COUNT(*) FILTER (WHERE is_seen = false) as unseen,
            COUNT(*) FILTER (WHERE is_seen = true) as seen,
            COUNT(*) FILTER (WHERE is_read = false) as unread,
            COUNT(*) FILTER (WHERE is_read = true) as read
        FROM notifications
        GROUP BY type
        ORDER BY type
    `);
    console.log('\n=== NOTIFICATIONS STATE ===');
    res.rows.forEach(r => {
        console.log(`  ${r.type}: unseen=${r.unseen} seen=${r.seen} | unread=${r.unread} read=${r.read}`);
    });

    const total = await pool.query(`SELECT COUNT(*) FROM notifications`);
    console.log(`\nTotal: ${total.rows[0].count}`);

    process.exit();
}
run().catch(e => { console.error(e.message); process.exit(1); });
