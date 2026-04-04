const pool = require("../db/db");
const { checkText } = require("../utils/moderation");

module.exports = async (req, res) => {
    const postId = parseInt(req.params.postId, 10);
    const { content } = req.body;
    const userId = req.user.id;

    if (!Number.isFinite(postId) || !content || content.trim() === "") {
        return res.status(400).json({ status: "fail", message: "Invalid post id or content" });
    }

    if (!Number.isFinite(userId)) {
        return res.status(400).json({ status: "fail", message: "Invalid user id" });
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Run AI Moderation
        const isFlagged = await checkText(content);
        console.log(`[CommentCreation] Content: "${content.substring(0, 30)}..." - Flagged: ${isFlagged}`);

        const result = await client.query(
            "INSERT INTO comments (post_id, user_id, content, flagged, created_at) VALUES ($1, $2, $3, $4, timezone('utc', now())) RETURNING *",
            [postId, userId, content, isFlagged]
        );

        await client.query("COMMIT");
        return res.status(201).json({ status: "success", data: result.rows[0] });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Create comment error:", error);
        return res.status(500).json({ status: "fail", message: "Server error: " + error.message });
    } finally {
        client.release();
    }
};