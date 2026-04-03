const pool = require("../db/db");

module.exports = async (req, res) => {
  const currentUserId = Number(req.user.id);

  if (!Number.isFinite(currentUserId)) {
    return res.status(400).json({ status: "fail", message: "Invalid user id" });
  }

  try {
    const result = await pool.query(
      `SELECT
         u.user_id,
         u.username,
         u.full_name,
         u.nickname,
         u.profile_picture,
         u.last_seen,
         MAX(f.created_at) AS friended_at
       FROM friends f
       JOIN users u
         ON u.user_id = CASE
           WHEN f.friend1_id = $1 THEN f.friend2_id
           ELSE f.friend1_id
         END
       WHERE f.friend1_id = $1 OR f.friend2_id = $1
       GROUP BY u.user_id, u.username, u.full_name, u.nickname, u.profile_picture, u.last_seen
       ORDER BY friended_at DESC`,
      [currentUserId]
    );

    return res.json({
      status: "success",
      count: result.rows.length,
      data: result.rows,
    });
  } catch (err) {
    console.error("Get friends list error:", err);
    return res.status(500).json({ status: "fail", message: "Server error" });
  }
};
