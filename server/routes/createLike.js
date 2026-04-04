const pool = require("../db/db");

const ALLOWED_REACTIONS = new Set(["👍", "❤️", "😂", "🥰", "😮", "😢", "😡"]);

module.exports = async (req, res) => {
    const currentUserId = Number(req.user.id);
    const postId = Number(req.params.postId);
    const emoji = typeof req.body.emoji === "string" ? req.body.emoji.trim() : "";

    if (!Number.isFinite(currentUserId) || !Number.isFinite(postId)) {
        return res.status(400).json({ status: "fail", message: "Invalid request" });
    }

    if (!ALLOWED_REACTIONS.has(emoji)) {
        return res.status(400).json({ status: "fail", message: "Invalid reaction" });
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const postExists = await client.query(
            "SELECT post_id FROM posts WHERE post_id = $1",
            [postId]
        );
        if (!postExists.rows.length) {
            await client.query("ROLLBACK");
            return res.status(404).json({ status: "fail", message: "Post not found" });
        }

        const targetType = `post_reaction:${emoji}`;
        const existingResult = await client.query(
            `SELECT like_id, target_type
             FROM likes
             WHERE user_id = $1 AND target_id = $2
             LIMIT 1`,
            [currentUserId, postId]
        );

        if (existingResult.rows.length > 0) {
            const existing = existingResult.rows[0];
            if (existing.target_type === targetType) {
                // Toggle off (same emoji)
                await client.query("DELETE FROM likes WHERE like_id = $1", [existing.like_id]);
                await client.query("COMMIT");
                return res.json({ status: "success", action: "removed" });
            } else {
                // Change emoji (different reaction)
                await client.query(
                    "UPDATE likes SET target_type = $1 WHERE like_id = $2",
                    [targetType, existing.like_id]
                );
                await client.query("COMMIT");
                return res.json({ status: "success", action: "updated", emoji });
            }
        }

        // Add new reaction
        await client.query(
            `INSERT INTO likes (user_id, target_type, target_id)
             VALUES ($1, $2, $3)`,
            [currentUserId, targetType, postId]
        );

        await client.query("COMMIT");
        return res.json({ status: "success", action: "added", emoji });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Create like error:", err);
        return res.status(500).json({ status: "fail", message: "Server error" });
    } finally {
        client.release();
    }
}
