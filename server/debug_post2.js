require("dotenv").config();
const pool = require("./db/db");

async function testPost() {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        
        console.log("Inserting into posts...");
        const postResult = await client.query(
            `INSERT INTO posts (user_id, caption, visibility, post_type, flagged, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, timezone('utc', now()), timezone('utc', now()))
             RETURNING *`,
            [1, "Test post", 1, "p", true]
        );
        const newPost = postResult.rows[0];
        console.log("Inserted post:", newPost.post_id);

        console.log("Inserting into content_media...");
        const mediaResult = await client.query(
            `INSERT INTO content_media (media_url, media_type, type, reference_id, flagged, media_order)
             VALUES ($1, $2, 'post', $3, $4, $5)
             RETURNING *`,
            ["http://test.url/vid.mp4", "video", newPost.post_id, false, 0]
        );
        console.log("Inserted media:", mediaResult.rows[0].media_id);

        await client.query("ROLLBACK");
        console.log("Test OK, rolled back.");
    } catch (err) {
        await client.query("ROLLBACK");
        require('fs').writeFileSync('err_log.txt', String(err.stack || err));
    } finally {
        client.release();
    }
}

testPost().then(() => process.exit(0));
