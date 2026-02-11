const pool = require("../db/db");
const jwt = require("jsonwebtoken");

module.exports = async (req, res) => {
  try {
    const profileUserId = req.params.profileUserId;

    /* 1️⃣ Get current user from JWT */
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // not logged in
      return res.json({ status: "NONE" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUserId = decoded.id;

    /* 2️⃣ Own profile */
    if (String(currentUserId) === String(profileUserId)) {
      return res.json({ status: "SELF" });
    }

    /* 3️⃣ Check if already friends */
    const friendsResult = await pool.query(
      `
      SELECT 1
      FROM friends
      WHERE 
        (friend1_id = $1 AND friend2_id = $2)
        OR
        (friend1_id = $2 AND friend2_id = $1)
      `,
      [currentUserId, profileUserId]
    );

    if (friendsResult.rows.length > 0) {
      return res.json({ status: "FRIENDS" });
    }

    /* 4️⃣ Check friend requests */
    const requestResult = await pool.query(
      `
      SELECT sender_id, receiver_id
      FROM friend_requests
      WHERE 
        (sender_id = $1 AND receiver_id = $2)
        OR
        (sender_id = $2 AND receiver_id = $1)
      `,
      [currentUserId, profileUserId]
    );

    if (requestResult.rows.length === 0) {
      return res.json({ status: "NONE" });
    }

    const request = requestResult.rows[0];

    // current user sent request
    if (String(request.sender_id) === String(currentUserId)) {
      return res.json({ status: "SENT" });
    }

    // current user received request
    return res.json({ status: "RECEIVED" });

  } catch (err) {
    console.error("getFriendStatus error:", err.message);
    return res.status(500).json({ status: "NONE" });
  }
};
