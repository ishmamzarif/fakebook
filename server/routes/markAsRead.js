const pool = require("../db/db");

module.exports = async (req, res) => {
  const currentUserId = req.user.id;
  const { conversationId } = req.params;

  if (!conversationId) {
    return res.status(400).json({ status: "fail", message: "Missing conversation ID" });
  }

  try {
    await pool.query(
      `UPDATE conversation_members
       SET last_read_at = CURRENT_TIMESTAMP
       WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, currentUserId]
    );

    res.json({
      status: "success",
      message: "Conversation marked as read",
    });
  } catch (err) {
    console.error("Mark conversation as read error:", err);
    res.status(500).json({ status: "fail", message: "Server error" });
  }
};
