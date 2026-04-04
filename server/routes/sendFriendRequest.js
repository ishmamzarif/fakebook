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

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      /* Check for duplicate requests */
      const exists = await client.query(
        "SELECT 1 FROM friend_requests WHERE sender_id = $1 AND receiver_id = $2 AND status = 'pending'",
        [senderId, receiver_id]
      );

      if (exists.rows.length) {
        await client.query("COMMIT");
        return res.json({ status: "SENT" });
      }

      /* Delete any previous stale requests (like rejected or ghost accepted states) */
      await client.query(
        "DELETE FROM friend_requests WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)",
        [senderId, receiver_id]
      );

      /* Insert request */
      await client.query(
        "INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES ($1, $2, 'pending') ON CONFLICT DO NOTHING",
        [senderId, receiver_id]
      );

      await client.query("COMMIT");
      return res.json({ status: "SENT" });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("sendFriendRequest error:", err.message);
    return res.status(500).json({ status: "fail", message: "Server error" });
  }
};