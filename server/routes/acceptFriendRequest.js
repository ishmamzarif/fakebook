const pool = require("../db/db");

module.exports = async (req, res) => {
  try {
    const currentUserId = Number(req.user.id);
    const { senderId } = req.body; 

    if (!senderId) {
      return res.status(400).json({ status: "fail", message: "senderId required" });
    }
    
    // 1. Call the stored procedure to handle the acceptance logic
    try {
      await pool.query(
        `CALL accept_friend_request($1, $2)`,
        [senderId, currentUserId]
      );
    } catch (err) {
      if (err.message.includes("Friend request not found")) {
        return res.status(404).json({ status: "fail", message: "Request not found" });
      }
      throw err;
    }

    res.json({ status: "FRIENDS" });

  } catch (err) {
    console.error("Accept friend error:", err.message);
    res.status(500).json({ status: "fail" });
  }
};
