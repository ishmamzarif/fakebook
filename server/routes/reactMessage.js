const pool = require("../db/db");

const ALLOWED_REACTIONS = new Set(["👍", "❤️", "😂", "🥰", "😮", "😢", "😡"]);

module.exports = async (req, res) => {
  const currentUserId = Number(req.user.id);
  const messageId = Number(req.params.messageId);
  const emoji = typeof req.body.emoji === "string" ? req.body.emoji.trim() : "";

  if (!Number.isFinite(currentUserId) || !Number.isFinite(messageId)) {
    return res.status(400).json({ status: "fail", message: "Invalid request" });
  }

  if (!ALLOWED_REACTIONS.has(emoji)) {
    return res.status(400).json({ status: "fail", message: "Invalid reaction" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const messageExists = await client.query(
      "SELECT message_id FROM messages WHERE message_id = $1",
      [messageId]
    );
    if (!messageExists.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ status: "fail", message: "Message not found" });
    }

    const targetType = `message_reaction:${emoji}`;
    const existing = await client.query(
      `SELECT like_id
       FROM likes
       WHERE user_id = $1 AND target_type = $2 AND target_id = $3
       LIMIT 1`,
      [currentUserId, targetType, messageId]
    );

    if (existing.rows.length) {
      await client.query("DELETE FROM likes WHERE like_id = $1", [existing.rows[0].like_id]);
      await client.query("COMMIT");
      return res.json({ status: "success", action: "removed" });
    }

    await client.query(
      `INSERT INTO likes (user_id, target_type, target_id)
       VALUES ($1, $2, $3)`,
      [currentUserId, targetType, messageId]
    );

    await client.query("COMMIT");
    return res.json({ status: "success", action: "added" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("React message error:", err);
    return res.status(500).json({ status: "fail", message: "Server error" });
  } finally {
    client.release();
  }
};
