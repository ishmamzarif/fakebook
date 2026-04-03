const pool = require("../db/db");

module.exports = async (req, res) => {
  const currentUserId = Number(req.user.id);

  if (!Number.isFinite(currentUserId)) {
    return res.status(400).json({ status: "fail", message: "Invalid user id" });
  }

  try {
    const unreadCountResult = await pool.query(
      "SELECT COUNT(*)::int as count FROM notifications WHERE user_id = $1 AND is_seen = false",
      [currentUserId]
    );

    return res.json({ 
      status: "success", 
      unreadCount: unreadCountResult.rows[0].count 
    });
  } catch (err) {
    console.error("Get unread count error:", err);
    return res.status(500).json({ status: "fail", message: "Server error" });
  }
};
