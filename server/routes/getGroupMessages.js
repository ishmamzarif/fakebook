const pool = require("../db/db");

module.exports = async (req, res) => {
  const currentUserId = Number(req.user.id);
  const conversationId = Number(req.params.conversationId);

  if (!Number.isFinite(currentUserId) || !Number.isFinite(conversationId)) {
    return res.status(400).json({ status: "fail", message: "Invalid request" });
  }

  try {
    const convoResult = await pool.query(
      `SELECT c.conversation_id, c.group_name, c.is_group
       FROM conversations c
       JOIN conversation_members cm
         ON cm.conversation_id = c.conversation_id
       WHERE c.conversation_id = $1
         AND cm.user_id = $2
         AND c.is_group = true`,
      [conversationId, currentUserId]
    );

    if (!convoResult.rows.length) {
      return res.status(404).json({ status: "fail", message: "Group not found" });
    }

    const membersResult = await pool.query(
      `SELECT u.user_id, u.username, u.full_name, u.profile_picture
       FROM conversation_members cm
       JOIN users u ON u.user_id = cm.user_id
       WHERE cm.conversation_id = $1
       ORDER BY u.full_name ASC NULLS LAST, u.username ASC`,
      [conversationId]
    );

    const messagesResult = await pool.query(
      `SELECT
          m.message_id,
          m.sender_id,
          m.content,
          m.created_at,
          u.username AS sender_username,
          u.full_name AS sender_full_name,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'media_id', cm.media_id,
                'media_url', cm.media_url,
                'media_type', cm.media_type
              )
            ) FILTER (WHERE cm.media_id IS NOT NULL),
            '[]'::json
          ) AS media,
          COALESCE(
            (
              SELECT JSON_AGG(
                JSON_BUILD_OBJECT(
                  'emoji', reaction.emoji,
                  'count', reaction.count,
                  'reacted_by_me', reaction.reacted_by_me
                )
              )
              FROM (
                SELECT
                  SPLIT_PART(l.target_type, ':', 2) AS emoji,
                  COUNT(*)::int AS count,
                  BOOL_OR(l.user_id = $2) AS reacted_by_me
                FROM likes l
                WHERE l.target_id = m.message_id
                  AND l.target_type LIKE 'message_reaction:%'
                GROUP BY SPLIT_PART(l.target_type, ':', 2)
                ORDER BY COUNT(*) DESC
              ) reaction
            ),
            '[]'::json
          ) AS reactions
       FROM messages m
       JOIN users u ON u.user_id = m.sender_id
       LEFT JOIN content_media cm
         ON cm.type = 'message'
        AND cm.reference_id = m.message_id
       WHERE m.conversation_id = $1
       GROUP BY m.message_id, u.user_id
       ORDER BY m.created_at ASC
       LIMIT 200`,
      [conversationId, currentUserId]
    );

    return res.json({
      status: "success",
      data: {
        conversation: convoResult.rows[0],
        members: membersResult.rows,
        messages: messagesResult.rows,
      },
    });
  } catch (err) {
    console.error("Get group messages error:", err);
    return res.status(500).json({ status: "fail", message: "Server error" });
  }
};

