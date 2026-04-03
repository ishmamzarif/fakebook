const pool = require("../db/db");

module.exports = async (req, res) => {
  const currentUserId = Number(req.user.id);

  if (!Number.isFinite(currentUserId)) {
    return res.status(400).json({ status: "fail", message: "Invalid user id" });
  }

  try {
    const result = await pool.query(
      `SELECT
         n.notification_id,
         n.user_id,
         n.type,
         n.reference_id,
         n.created_at,
         n.is_read,
         n.is_seen,
         n.actor_id,
         u.username  AS actor_username,
         u.full_name AS actor_full_name,
         u.profile_picture AS actor_profile_picture,
         CASE
            WHEN n.type IN ('new_post', 'post_tag', 'post_flagged') THEN n.reference_id
            WHEN n.type IN ('comment', 'comment_flagged') THEN (
              SELECT c.post_id FROM comments c WHERE c.comment_id = n.reference_id LIMIT 1
            )
            WHEN n.type IN ('comment_reply', 'comment_reply_flagged') THEN (
              SELECT c.post_id FROM comment_replies r
              JOIN comments c ON c.comment_id = r.comment_id
              WHERE r.reply_id = n.reference_id LIMIT 1
            )
            WHEN n.type = 'content_flagged' THEN (
              COALESCE(
                (SELECT c.post_id FROM comments c WHERE c.comment_id = n.reference_id LIMIT 1),
                (SELECT c.post_id FROM comment_replies r JOIN comments c ON c.comment_id = r.comment_id WHERE r.reply_id = n.reference_id LIMIT 1),
                n.reference_id -- If it's a post
              )
            )
           WHEN n.type = 'like' THEN (
             SELECT CASE
               WHEN l.target_type LIKE 'post%' THEN l.target_id
               WHEN l.target_type LIKE 'comment%' THEN (
                 SELECT c.post_id FROM comments c WHERE c.comment_id = l.target_id LIMIT 1
               )
             END
             FROM likes l WHERE l.like_id = n.reference_id LIMIT 1
           )
           ELSE NULL
         END AS post_id,
         CASE
           WHEN n.type = 'message' THEN (
             SELECT m.conversation_id FROM messages m WHERE m.message_id = n.reference_id LIMIT 1
           )
           ELSE NULL
         END AS conversation_id,
         CASE
           WHEN n.type = 'message' THEN (
             SELECT c.is_group FROM messages m 
             JOIN conversations c ON c.conversation_id = m.conversation_id 
             WHERE m.message_id = n.reference_id LIMIT 1
           )
           ELSE false
         END AS is_group,
         CASE
           WHEN n.type = 'message' THEN (
             SELECT c.group_name FROM messages m 
             JOIN conversations c ON c.conversation_id = m.conversation_id 
             WHERE m.message_id = n.reference_id LIMIT 1
           )
           ELSE NULL
         END AS group_name,
         CASE
           WHEN n.type = 'message' THEN (
             SELECT c.group_photo_url FROM messages m 
             JOIN conversations c ON c.conversation_id = m.conversation_id 
             WHERE m.message_id = n.reference_id LIMIT 1
           )
           ELSE NULL
         END AS group_photo_url
       FROM notifications n
       LEFT JOIN users u ON n.actor_id = u.user_id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC`,
      [currentUserId]
    );

    const unreadCountResult = await pool.query(
      "SELECT get_unread_notifications_count($1) as count",
      [currentUserId]
    );

    return res.json({ 
      status: "success", 
      data: result.rows,
      unreadCount: unreadCountResult.rows[0].count 
    });
  } catch (err) {
    console.error("Get notifications error:", err);
    return res.status(500).json({ status: "fail", message: "Server error" });
  }
};
