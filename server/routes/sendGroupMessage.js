const pool = require("../db/db");

module.exports = async (req, res) => {
  const currentUserId = Number(req.user.id);
  const conversationId = Number(req.params.conversationId);
  const content = typeof req.body.content === "string" ? req.body.content.trim() : "";

  if (!Number.isFinite(currentUserId) || !Number.isFinite(conversationId)) {
    return res.status(400).json({ status: "fail", message: "Invalid request" });
  }

  if (!content) {
    return res.status(400).json({ status: "fail", message: "Message is empty" });
  }

  try {
    const membership = await pool.query(
      `SELECT 1
       FROM conversation_members
       WHERE conversation_id = $1 AND user_id = $2
       LIMIT 1`,
      [conversationId, currentUserId]
    );

    if (!membership.rows.length) {
      return res.status(403).json({ status: "fail", message: "Not a member of this group" });
    }

    const inserted = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, content)
       VALUES ($1, $2, $3)
       RETURNING message_id, conversation_id, sender_id, content, created_at`,
      [conversationId, currentUserId, content]
    );

    return res.status(201).json({
      status: "success",
      data: inserted.rows[0],
    });
  } catch (err) {
    console.error("Send group message error:", err);
    return res.status(500).json({ status: "fail", message: "Server error" });
  }
};

