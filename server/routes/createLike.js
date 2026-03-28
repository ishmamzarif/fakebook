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

    try {
        const postExists = await pool.query(
            "SELECT post_id FROM posts WHERE post_id = $1",
            [postId]
        );
        if (!postExists.rows.length) {
            return res.status(404).json({ status: "fail", message: "Post not found" });
        }

        const targetType = `post_reaction:${emoji}`;
        const existingResult = await pool.query(
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
                await pool.query("DELETE FROM likes WHERE like_id = $1", [existing.like_id]);
                return res.json({ status: "success", action: "removed" });
            } else {
                // Change emoji (different reaction)
                await pool.query(
                    "UPDATE likes SET target_type = $1 WHERE like_id = $2",
                    [targetType, existing.like_id]
                );
                return res.json({ status: "success", action: "updated", emoji });
            }
        }

        // Add new reaction
        await pool.query(
            `INSERT INTO likes (user_id, target_type, target_id)
             VALUES ($1, $2, $3)`,
            [currentUserId, targetType, postId]
        );

        return res.json({ status: "success", action: "added", emoji });
    } catch (err) {
        console.error("Create like error:", err);
        return res.status(500).json({ status: "fail", message: "Server error" });
    }
}