const pool = require("../db/db");

module.exports = async (req, res) => {
  const { conversationId } = req.params;
  const currentUserId = req.user.id;

  try {
    // Check if user is member of the group
    const membership = await pool.query(
      "SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2",
      [conversationId, currentUserId]
    );

    if (membership.rows.length === 0) {
      return res.status(403).json({ status: "fail", message: "Not a member of this group" });
    }

    const members = await pool.query(
      `SELECT u.user_id, u.username, u.full_name, u.profile_picture
       FROM conversation_members cm
       JOIN users u ON cm.user_id = u.user_id
       WHERE cm.conversation_id = $1`,
      [conversationId]
    );

    res.json({
      status: "success",
      data: members.rows,
    });
  } catch (err) {
    console.error("Get group members error:", err);
    res.status(500).json({ status: "fail", message: "Server error" });
  }
};
