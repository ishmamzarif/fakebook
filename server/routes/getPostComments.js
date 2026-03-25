const pool = require("../db/db");

module.exports = async (req, res) => {
  const currentUserId = Number(req.user.id);
  const postId = Number(req.params.postId);

  if (!Number.isFinite(currentUserId)) {
    return res.status(400).json({ status: "fail", message: "Invalid user id" });
  }

  if (!Number.isFinite(postId)) {
    return res.status(400).json({ status: "fail", message: "Invalid post id" });
  }

  try {
    const result = await pool.query(
      `SELECT
         c.comment_id,
         c.post_id,
         c.user_id,
         c.content,
         c.created_at
       FROM comments c
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC
       LIMIT 200`,
      [postId]
    );

    return res.json({ status: "success", data: result.rows });
  } catch (err) {
    console.error("Get post comments error:", err);
    return res.status(500).json({ status: "fail", message: "Server error" });
  }
};

