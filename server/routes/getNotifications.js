const pool = require("../db/db");

module.exports = async (req, res) => {
  const currentUserId = Number(req.user.id);

  if (!Number.isFinite(currentUserId)) {
    return res.status(400).json({ status: "fail", message: "Invalid user id" });
  }

  try {
    const result = await pool.query(
      `SELECT
         n.notification_id,
         n.user_id,
         n.type,
         n.reference_id,
         n.created_at
       FROM notifications n
       JOIN users u ON n.user_id = u.user_id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC`,
      [currentUserId]
    );

    return res.json({ status: "success", data: result.rows });
  } catch (err) {
    console.error("Get notifications error:", err);
    return res.status(500).json({ status: "fail", message: "Server error" });
  }
};
