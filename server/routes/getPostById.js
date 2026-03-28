const pool = require("../db/db");

module.exports = async (req, res) => {
  const currentUserId = req.user ? Number(req.user.id) : null;
  const postId = Number(req.params.id);

  if (!Number.isFinite(postId)) {
    return res.status(400).json({ status: "fail", message: "Invalid post ID" });
  }

  try {
    const result = await pool.query(
      `SELECT
         p.post_id,
         p.user_id,
         p.caption,
         p.post_type,
         p.created_at,
         u.username,
         u.full_name,
         u.profile_picture,
         COUNT(DISTINCT CASE WHEN l.target_type LIKE 'post_reaction:%' THEN l.like_id END)::int AS likes_count,
         COUNT(DISTINCT c.comment_id)::int AS comments_count,
         (
           SELECT SUBSTRING(target_type FROM 15)
           FROM likes
           WHERE user_id = $1 AND target_id = p.post_id AND target_type LIKE 'post_reaction:%'
           LIMIT 1
         ) AS user_reaction,
         COALESCE(
           JSON_AGG(
             JSON_BUILD_OBJECT(
               'media_id', cm.media_id,
               'media_url', cm.media_url,
               'media_type', cm.media_type,
               'media_order', cm.media_order
             )
           ) FILTER (WHERE cm.media_id IS NOT NULL),
           '[]'::json
         ) AS media
       FROM posts p
       JOIN users u ON p.user_id = u.user_id
       LEFT JOIN likes l
         ON l.target_id = p.post_id
       LEFT JOIN comments c
         ON c.post_id = p.post_id
       LEFT JOIN content_media cm
         ON cm.type = 'post'
        AND cm.reference_id = p.post_id
       WHERE p.post_id = $2
       GROUP BY p.post_id, u.user_id`,
      [currentUserId, postId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: "fail", message: "Post not found" });
    }

    res.json({
      status: "success",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Get post error:", err);
    res.status(500).json({ status: "fail", message: "Server error" });
  }
};
