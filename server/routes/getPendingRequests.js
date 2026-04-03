const pool = require("../db/db");

module.exports = async (req, res) => {
  const currentUserId = Number(req.user.id);

  if (!Number.isFinite(currentUserId)) {
    return res.status(400).json({ status: "fail", message: "Invalid user id" });
  }

  try {
    const result = await pool.query(
      `SELECT
         r.request_id,
         u.user_id,
         u.username,
         u.full_name,
         u.profile_picture,
         r.created_at
       FROM friend_requests r
       JOIN users u ON u.user_id = r.sender_id
       WHERE r.receiver_id = $1 AND r.status = 'pending'
       ORDER BY r.created_at DESC`,
      [currentUserId]
    );

    return res.json({
      status: "success",
      count: result.rows.length,
      data: result.rows,
    });
  } catch (err) {
    console.error("Get pending requests error:", err);
    return res.status(500).json({ status: "fail", message: "Server error" });
  }
};
