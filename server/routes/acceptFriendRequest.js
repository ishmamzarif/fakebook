const jwt = require("jsonwebtoken");
const pool = require("../db/db");

module.exports = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ status: "UNAUTHORIZED" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUserId = decoded.id;

    const { senderId } = req.body; // who sent the request

    if (!senderId) {
      return res.status(400).json({ status: "fail", message: "senderId required" });
    }
    
    const request = await pool.query(
      `
      SELECT 1
      FROM friend_requests
      WHERE sender_id = $1 AND receiver_id = $2
      `,
      [senderId, currentUserId]
    );

    if (!request.rows.length) {
      return res.status(404).json({ status: "fail", message: "Request not found" });
    }

    await pool.query(
      `
      INSERT INTO friends (friend1_id, friend2_id)
      VALUES ($1, $2)
      `,
      [senderId, currentUserId]
    );

    await pool.query(
      `
      DELETE FROM friend_requests
      WHERE sender_id = $1 AND receiver_id = $2
      `,
      [senderId, currentUserId]
    );

    res.json({ status: "FRIENDS" });

  } catch (err) {
    console.error("Accept friend error:", err.message);
    res.status(500).json({ status: "fail" });
  }
};
