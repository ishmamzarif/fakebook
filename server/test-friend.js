require('dotenv').config({path: './.env'});
const pool = require('./db/db');
(async () => {
    try {
        const client = await pool.connect();
        
        let res = await client.query("INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES (1, 2, 'pending') RETURNING request_id");
        const reqId = res.rows[0].request_id;
        console.log("Friend request inserted", reqId);

        let notifInfo = await client.query("SELECT * FROM notifications WHERE reference_id = $1", [reqId]);
        console.log("Notifications after insert:", notifInfo.rows);
        
        await client.query("UPDATE friend_requests SET status = 'accepted' WHERE request_id = $1", [reqId]);
        
        let notifInfo2 = await client.query("SELECT * FROM notifications WHERE reference_id = $1", [reqId]);
        console.log("Notifications after update:", notifInfo2.rows);

        // Cleanup
        await client.query("DELETE FROM friend_requests WHERE request_id = $1", [reqId]);
        client.release();
    } catch(e) { console.error(e); } finally { pool.end(); }
})();
