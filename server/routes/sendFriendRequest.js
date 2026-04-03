const pool = require("../db/db");

module.exports = async (req, res) => {
  try {
    const senderId = Number(req.user.id);
    const { receiver_id } = req.body;

    if (!receiver_id) {
      return res.status(400).json({ status: "fail", message: "receiver_id required" });
    }

    if (senderId === Number(receiver_id)) {
      return res.status(400).json({ status: "fail", message: "Cannot friend yourself" });
    }

    /* Check for duplicate requests */
    const exists = await pool.query(
      "SELECT 1 FROM friend_requests WHERE sender_id = $1 AND receiver_id = $2 AND status = 'pending'",
      [senderId, receiver_id]
    );

    if (exists.rows.length) {
      return res.json({ status: "SENT" });
    }

    /* Insert request */
    await pool.query(
      "INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES ($1, $2, 'pending') ON CONFLICT DO NOTHING",
      [senderId, receiver_id]
    );

    return res.json({ status: "SENT" });

  } catch (err) {
    console.error("sendFriendRequest error:", err.message);
    return res.status(500).json({ status: "fail", message: "Server error" });
  }
};