const pool = require("../db/db");

module.exports = async (req, res) => {
  const currentUserId = Number(req.user.id);
  const otherUserId = Number(req.params.userId);

  if (!Number.isFinite(currentUserId) || !Number.isFinite(otherUserId)) {
    return res.status(400).json({ status: "fail", message: "Invalid user id" });
  }

  if (currentUserId === otherUserId) {
    return res.status(400).json({ status: "fail", message: "Cannot message yourself" });
  }

  try {
    const otherUserResult = await pool.query(
      `SELECT user_id, username, full_name, profile_picture
       FROM users
       WHERE user_id = $1`,
      [otherUserId]
    );

    if (!otherUserResult.rows.length) {
      return res.status(404).json({ status: "fail", message: "User not found" });
    }

    const convoResult = await pool.query(
      `SELECT c.conversation_id
       FROM conversations c
       JOIN conversation_members cm ON cm.conversation_id = c.conversation_id
       WHERE c.is_group = false
       GROUP BY c.conversation_id
       HAVING COUNT(*) = 2
         AND BOOL_OR(cm.user_id = $1)
         AND BOOL_OR(cm.user_id = $2)
       LIMIT 1`,
      [currentUserId, otherUserId]
    );

    if (!convoResult.rows.length) {
      return res.json({
        status: "success",
        data: {
          other_user: otherUserResult.rows[0],
          conversation_id: null,
          messages: [],
        },
      });
    }

    const conversationId = convoResult.rows[0].conversation_id;

    const messagesResult = await pool.query(
      `SELECT
          m.message_id,
          m.sender_id,
          m.content,
          m.created_at,
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
       LEFT JOIN content_media cm
         ON cm.type = 'message'
        AND cm.reference_id = m.message_id
       WHERE m.conversation_id = $1
       GROUP BY m.message_id
       ORDER BY m.created_at ASC
       LIMIT 200`,
      [conversationId, currentUserId]
    );

    return res.json({
      status: "success",
      data: {
        other_user: otherUserResult.rows[0],
        conversation_id: conversationId,
        messages: messagesResult.rows,
      },
    });
  } catch (err) {
    console.error("Get messages error:", err);
    return res.status(500).json({ status: "fail", message: "Server error" });
  }
};
