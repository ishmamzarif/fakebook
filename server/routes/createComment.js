const pool = require("../db/db");

module.exports = async (req, res) => {
    const { postId, content } = req.body;
    const userId = req.user.id;

    if (!Number.isFinite(postId) || !content || content.trim() === "") {
        return res.status(400).json({ status: "fail", message: "Invalid post id or content" });
    }

    if (!Number.isFinite(userId)) {
        return res.status(400).json({ status: "fail", message: "Invalid user id" });
    }

    try {
        const result = await pool.query(
            "INSERT INTO comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING *",
            [postId, userId, content]
        );

        return res.status(201).json({ status: "success", data: result.rows[0] });
    } catch (error) {
        console.error("Create comment error:", error);
        return res.status(500).json({ status: "fail", message: "Server error" });
    }
};