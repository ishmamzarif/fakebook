const pool = require("../db/db");
const jwt = require("jsonwebtoken");

module.exports = async (req, res) => {
  try {
    /* 1️⃣ Auth */
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const senderId = decoded.id;

    /* 2️⃣ Body */
    const { receiver_id } = req.body;

    if (!receiver_id) {
      return res.status(400).json({ message: "receiver_id required" });
    }

    if (String(senderId) === String(receiver_id)) {
      return res.status(400).json({ message: "Invalid request" });
    }

    /* 3️⃣ Delete pending request */
    const result = await pool.query(
      `
      DELETE FROM friend_requests
      WHERE sender_id = $1 AND receiver_id = $2
      `,
      [senderId, receiver_id]
    );

    /* 4️⃣ Nothing to cancel */
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Request not found" });
    }

    return res.json({ status: "CANCELLED" });

  } catch (err) {
    console.error("cancelFriendRequest error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};