const pool = require("../db/db");

module.exports = async (req, res) => {
  const currentUserId = Number(req.user.id);
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const memberIds = Array.isArray(req.body.member_ids) ? req.body.member_ids : [];

  if (!Number.isFinite(currentUserId)) {
    return res.status(400).json({ status: "fail", message: "Invalid user id" });
  }

  const uniqueMemberIds = Array.from(
    new Set(
      memberIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id !== currentUserId)
    )
  );

  if (!name) {
    return res.status(400).json({ status: "fail", message: "Group name is required" });
  }

  if (uniqueMemberIds.length === 0) {
    return res.status(400).json({ status: "fail", message: "Select at least one friend" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const conversationResult = await client.query(
      `INSERT INTO conversations (is_group, group_name, created_by)
       VALUES (true, $1, $2)
       RETURNING conversation_id, is_group, group_name, created_at`,
      [name, currentUserId]
    );

    const conversation = conversationResult.rows[0];

    const allMembers = [currentUserId, ...uniqueMemberIds];
    for (const userId of allMembers) {
      await client.query(
        `INSERT INTO conversation_members (conversation_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [conversation.conversation_id, userId]
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({
      status: "success",
      data: conversation,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Create group conversation error:", err);
    return res.status(500).json({ status: "fail", message: "Server error" });
  } finally {
    client.release();
  }
};

