const pool = require("../db/db");

module.exports = async (req, res) => {
  const postId = Number(req.params.id);

  if (!Number.isFinite(postId)) {
    return res.status(400).json({ status: "fail", message: "Invalid post ID" });
  }

  try {
    const result = await pool.query(
      `SELECT 
         l.user_id, 
         u.username, 
         u.full_name, 
         u.profile_picture, 
         SUBSTRING(l.target_type FROM 15) AS emoji
       FROM likes l
       JOIN users u ON l.user_id = u.user_id
       WHERE l.target_id = $1 AND l.target_type LIKE 'post_reaction:%'
       ORDER BY l.created_at DESC`,
      [postId]
    );

    res.json({
      status: "success",
      data: result.rows,
    });
  } catch (err) {
    console.error("Get post reactions error:", err);
    res.status(500).json({ status: "fail", message: "Server error" });
  }
};
