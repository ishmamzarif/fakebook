const pool = require("../db/db");

module.exports = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const result = await pool.query(
      `SELECT
         c.conversation_id,
         c.is_group,
         c.group_name,
         c.group_photo_url,
         u.user_id AS other_user_id,
         u.username,
         u.full_name,
         u.profile_picture,
         m.content AS message_text,
         m.created_at
       FROM conversations c
       JOIN conversation_members cm ON c.conversation_id = cm.conversation_id
       LEFT JOIN LATERAL (
         SELECT u.user_id, u.username, u.full_name, u.profile_picture
         FROM conversation_members cm2
         JOIN users u ON cm2.user_id = u.user_id
         WHERE cm2.conversation_id = c.conversation_id AND cm2.user_id != $1
         LIMIT 1
       ) u ON true
       LEFT JOIN LATERAL (
         SELECT content, created_at
         FROM messages
         WHERE conversation_id = c.conversation_id
         ORDER BY created_at DESC
         LIMIT 1
       ) m ON true
       WHERE cm.user_id = $1
       ORDER BY m.created_at DESC NULLS LAST`,
      [currentUserId]
    );

    res.json({
      status: "success",
      data: result.rows,
    });
  } catch (err) {
    console.error("Get conversations list error:", err);
    res.status(500).json({ status: "fail", message: "Server error" });
  }
};
