const pool = require("../db/db");

module.exports = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ status: "fail", message: "User ID required" });
    }

    if (String(userId) === String(currentUserId)) {
      return res.status(400).json({ status: "fail", message: "Cannot unfriend yourself" });
    }

    await pool.query(
      `DELETE FROM friends
       WHERE (friend1_id = $1 AND friend2_id = $2)
          OR (friend1_id = $2 AND friend2_id = $1)`,
      [currentUserId, userId]
    );

    await pool.query(
      `DELETE FROM friend_requests
       WHERE (sender_id = $1 AND receiver_id = $2)
          OR (sender_id = $2 AND receiver_id = $1)`,
      [currentUserId, userId]
    );

    return res.json({ status: "success" });

  } catch (err) {
    console.error("unfriendUser error:", err.message);
    return res.status(500).json({ status: "fail", message: "Server error" });
  }
};