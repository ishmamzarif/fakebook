const pool = require("../db/db");

module.exports = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            
            // Verify ownership
            const postRes = await client.query("SELECT * FROM posts WHERE post_id = $1", [id]);
            if (postRes.rows.length === 0) {
                await client.query("ROLLBACK");
                return res.status(404).json({ status: "fail", message: "Post not found" });
            }
            if (postRes.rows[0].user_id != userId) {
                await client.query("ROLLBACK");
                return res.status(403).json({ status: "fail", message: "Unauthorized to delete this post" });
            }

            // Let ON DELETE CASCADE handle content_media, comments, post_tags, likes
            await client.query("DELETE FROM posts WHERE post_id = $1", [id]);
            
            await client.query("COMMIT");
            res.status(200).json({ status: "success", message: "Post deleted successfully" });
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error("Delete post error:", err);
        res.status(500).json({ status: "fail", message: "Failed to delete post: " + err.message });
    }
};
