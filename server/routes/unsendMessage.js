const pool = require("../db/db");

module.exports = async (req, res) => {
  const currentUserId = Number(req.user.id);
  const messageId = Number(req.params.messageId);

  if (!Number.isFinite(currentUserId) || !Number.isFinite(messageId)) {
    return res.status(400).json({ status: "fail", message: "Invalid request" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const messageResult = await client.query(
      `SELECT message_id, sender_id
       FROM messages
       WHERE message_id = $1`,
      [messageId]
    );

    if (!messageResult.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ status: "fail", message: "Message not found" });
    }

    if (Number(messageResult.rows[0].sender_id) !== currentUserId) {
      await client.query("ROLLBACK");
      return res.status(403).json({ status: "fail", message: "Not allowed to unsend this message" });
    }

    await client.query(
      `DELETE FROM content_media
       WHERE type = 'message' AND reference_id = $1`,
      [messageId]
    );

    await client.query(
      `DELETE FROM messages
       WHERE message_id = $1`,
      [messageId]
    );

    await client.query("COMMIT");
    return res.json({ status: "success", message: "Message unsent" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Unsend message error:", err);
    return res.status(500).json({ status: "fail", message: "Server error" });
  } finally {
    client.release();
  }
};
