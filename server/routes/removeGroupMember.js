const pool = require("../db/db");

module.exports = async (req, res) => {
  const { conversationId, userId } = req.params;
  const currentUserId = req.user.id;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check if user is admin (owner)
    const conversation = await client.query(
      "SELECT created_by FROM conversations WHERE conversation_id = $1",
      [conversationId]
    );

    if (conversation.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ status: "fail", message: "Conversation not found" });
    }

    if (conversation.rows[0].created_by !== currentUserId) {
      await client.query("ROLLBACK");
      return res.status(403).json({ status: "fail", message: "Only admin can remove members" });
    }

    // Admins cannot remove themselves (must transfer ownership first or delete group entirely)
    if (parseInt(userId) === currentUserId) {
      await client.query("ROLLBACK");
      return res.status(400).json({ status: "fail", message: "Admin cannot remove themselves" });
    }

    const membership = await client.query(
      "SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2",
      [conversationId, userId]
    );

    if (membership.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ status: "fail", message: "User is not a member of this group" });
    }

    await client.query(
      "DELETE FROM conversation_members WHERE conversation_id = $1 AND user_id = $2",
      [conversationId, userId]
    );

    await client.query("COMMIT");
    res.json({
      status: "success",
      message: "Member removed successfully",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Remove group member error:", err);
    res.status(500).json({ status: "fail", message: "Server error" });
  } finally {
    client.release();
  }
};
