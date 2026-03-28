const pool = require("../db/db");

module.exports = async (req, res) => {
  const currentUserId = Number(req.user.id);

  if (!Number.isFinite(currentUserId)) {
    return res.status(400).json({ status: "fail", message: "Invalid user id" });
  }

  try {
    const result = await pool.query(
      `SELECT
         n.notification_id,
         n.user_id,
         n.type,
         n.reference_id,
         n.created_at,
         n.is_read,
         (
           SELECT JSON_BUILD_OBJECT(
             'user_id', u.user_id,
             'username', u.username,
             'full_name', u.full_name,
             'profile_picture', u.profile_picture,
             'status', fr.status
           )
           FROM friend_requests fr
           JOIN users u ON u.user_id = (
             CASE 
               WHEN n.type = 'friend_request' THEN fr.sender_id
               WHEN n.type = 'friend_request_accepted' THEN fr.receiver_id
               ELSE NULL
             END
           )
           WHERE fr.request_id = n.reference_id
         ) AS sender

       FROM notifications n
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC`,
      [currentUserId]
    );

    return res.json({ status: "success", data: result.rows });
  } catch (err) {
    console.error("Get notifications error:", err);
    return res.status(500).json({ status: "fail", message: "Server error" });
  }
};



