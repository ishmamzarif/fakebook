const pool = require("../db/db");
const jwt = require("jsonwebtoken");

module.exports = async (req, res) => {
    // console.log('ok\n');
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.log('returened\n');
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const senderId = decoded.id;

    const { receiver_id } = req.body;

    if (!receiver_id) {
      return res.status(400).json({ message: "receiver_id required" });
    }

    if (String(senderId) === String(receiver_id)) {
      return res.status(400).json({ message: "Cannot friend yourself" });
    }

    /* Prevent duplicate requests */
    const exists = await pool.query(
      `
      SELECT 1 FROM friend_requests
      WHERE sender_id = $1 AND receiver_id = $2
      `,
      [senderId, receiver_id]
    );

    

    if (exists.rows.length) {
      return res.json({ status: "SENT" });
    }
    console.log(senderId);

    /* Insert request */
    await pool.query(
      `
      INSERT INTO friend_requests (sender_id, receiver_id)
      VALUES ($1, $2)
      `,
      [senderId, receiver_id]
    );

    return res.json({ status: "SENT" });

  } catch (err) {
    console.error("sendFriendRequest error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};