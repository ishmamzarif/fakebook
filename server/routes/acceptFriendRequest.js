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
    const currentUserId = Number(decoded.id);

    const { senderId } = req.body; 

    if (!senderId) {
      return res.status(400).json({ status: "fail", message: "senderId required" });
    }
    
    // 1. Update friend_request status to accepted
    const result = await pool.query(
      `UPDATE friend_requests 
       SET status = 'accepted' 
       WHERE sender_id = $1 AND receiver_id = $2 
       RETURNING status`,
      [senderId, currentUserId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ status: "fail", message: "Request not found" });
    }

    // 2. Add to friends table
    const f1 = Math.min(Number(senderId), currentUserId);
    const f2 = Math.max(Number(senderId), currentUserId);

    await pool.query(
      `INSERT INTO friends (friend1_id, friend2_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [f1, f2]
    );

    res.json({ status: "FRIENDS" });

  } catch (err) {
    console.error("Accept friend error:", err.message);
    res.status(500).json({ status: "fail" });
  }
};
