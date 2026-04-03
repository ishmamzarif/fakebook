const pool = require("../db/db");

module.exports = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiver_id } = req.body;

    if (!receiver_id) {
      return res.status(400).json({ status: "fail", message: "receiver_id required" });
    }

    if (String(senderId) === String(receiver_id)) {
      return res.status(400).json({ status: "fail", message: "Invalid request" });
    }

    const result = await pool.query(
      "DELETE FROM friend_requests WHERE sender_id = $1 AND receiver_id = $2 AND status = 'pending'",
      [senderId, receiver_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ status: "fail", message: "Request not found" });
    }

    return res.json({ status: "CANCELLED" });

  } catch (err) {
    console.error("cancelFriendRequest error:", err.message);
    return res.status(500).json({ status: "fail", message: "Server error" });
  }
};