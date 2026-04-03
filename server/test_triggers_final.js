require("dotenv").config();
const pool = require("./db/db");

async function test() {
    try {
        console.log("--- Verifying Friend Request Triggers ---");
        // 1. Create two test users if they don't exist
        await pool.query("INSERT INTO users (username, email, password_hash) VALUES ('test_u1', 'u1@test.com', 'h'), ('test_u2', 'u2@test.com', 'h') ON CONFLICT DO NOTHING");
        const users = await pool.query("SELECT user_id FROM users WHERE username IN ('test_u1', 'test_u2') ORDER BY username");
        const u1 = users.rows[0].user_id;
        const u2 = users.rows[1].user_id;

        // 2. Send Friend Request
        console.log(`Sending friend request from ${u1} to ${u2}...`);
        await pool.query("DELETE FROM friend_requests WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)", [u1, u2]);
        const fr = await pool.query("INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES ($1, $2, 'pending') RETURNING request_id", [u1, u2]);
        const requestId = fr.rows[0].request_id;

        // Check notification
        let notif = await pool.query("SELECT * FROM notifications WHERE user_id = $1 AND type = 'friend_request' ORDER BY created_at DESC LIMIT 1", [u2]);
        console.log("Friend Request Notif:", notif.rows[0] ? "✅ FOUND" : "❌ NOT FOUND");

        // 3. Accept Friend Request
        console.log("Accepting friend request...");
        await pool.query("UPDATE friend_requests SET status = 'accepted' WHERE request_id = $1", [requestId]);
        notif = await pool.query("SELECT * FROM notifications WHERE user_id = $1 AND type = 'friend_request_accepted' ORDER BY created_at DESC LIMIT 1", [u1]);
        console.log("Acceptance Notif:", notif.rows[0] ? "✅ FOUND" : "❌ NOT FOUND");

        console.log("\n--- Verifying Flagged Content Triggers ---");
        const post = await pool.query("INSERT INTO posts (user_id, caption, visibility, post_type, flagged) VALUES ($1, 'flag me', 1, 'p', false) RETURNING post_id", [u1]);
        const postId = post.rows[0].post_id;
        await pool.query("UPDATE posts SET flagged = true WHERE post_id = $1", [postId]);
        notif = await pool.query("SELECT * FROM notifications WHERE user_id = $1 AND type = 'content_flagged' ORDER BY created_at DESC LIMIT 1", [u1]);
        console.log("Flagged Notif:", notif.rows[0] ? "✅ FOUND" : "❌ NOT FOUND");

    } catch (err) {
        console.error("Test Error:", err);
    } finally {
        await pool.end();
    }
}
test();
