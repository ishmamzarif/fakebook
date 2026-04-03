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

    // 2. Create a notification for the sender when their request is accepted.
    // This is safe even if your DB trigger already creates one, because it avoids duplicates.
    await pool.query(
      `INSERT INTO notifications (user_id, actor_id, type, reference_id)
       SELECT $1, $2, 'friend_request_accepted', fr.request_id
       FROM friend_requests fr
       WHERE fr.sender_id = $2
         AND fr.receiver_id = $1
         AND fr.status = 'accepted'
         AND NOT EXISTS (
           SELECT 1
           FROM notifications n
           WHERE n.user_id = $1
             AND n.actor_id = $2
             AND n.type = 'friend_request_accepted'
             AND n.reference_id = fr.request_id
         )
       LIMIT 1`,
      [senderId, currentUserId]
    );

    res.json({ status: "FRIENDS" });

  } catch (err) {
    console.error("Accept friend error:", err.message);
    res.status(500).json({ status: "fail" });
  }
};
