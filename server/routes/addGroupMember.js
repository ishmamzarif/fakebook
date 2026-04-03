const pool = require("../db/db");

module.exports = async (req, res) => {
  const { conversationId } = req.params;
  const { userId, userIds } = req.body;
  const currentUserId = req.user.id;

  const client = await pool.connect();
  try {
    // Check if user is admin (owner)
    const conversation = await client.query(
      "SELECT created_by FROM conversations WHERE conversation_id = $1",
      [conversationId]
    );

    if (conversation.rows.length === 0) {
      return res.status(404).json({ status: "fail", message: "Conversation not found" });
    }

    if (conversation.rows[0].created_by !== currentUserId) {
      return res.status(403).json({ status: "fail", message: "Only admin can add members" });
    }

    const targets = userIds || (userId ? [userId] : []);
    if (targets.length === 0) {
        return res.status(400).json({ status: "fail", message: "Select at least one member to add" });
    }

    await client.query("BEGIN");
    for (const tid of targets) {
        // Check if user is already a member
        const existing = await client.query(
            "SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2",
            [conversationId, tid]
        );

        if (existing.rows.length === 0) {
            await client.query(
                "INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2)",
                [conversationId, tid]
            );
        }
    }
    await client.query("COMMIT");

    res.json({
      status: "success",
      message: `${targets.length} member(s) processed`,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Add group member error:", err);
    res.status(500).json({ status: "fail", message: "Server error" });
  } finally {
    client.release();
  }
};
