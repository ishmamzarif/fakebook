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
    
    // 1. Update friend_request status to rejected
    const result = await pool.query(
      `UPDATE friend_requests 
       SET status = 'rejected' 
       WHERE sender_id = $1 AND receiver_id = $2 
       RETURNING status`,
      [senderId, currentUserId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ status: "fail", message: "Request not found" });
    }

    res.json({ status: "REJECTED" });

  } catch (err) {
    console.error("Reject friend error:", err.message);
    res.status(500).json({ status: "fail" });
  }
};



