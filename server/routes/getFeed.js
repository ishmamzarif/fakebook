const pool = require("../db/db");

module.exports = async (req, res) => {
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
       GROUP BY p.post_id, u.user_id
       ORDER BY p.created_at DESC`
    );

    res.json({
      status: "success",
      data: result.rows,
    });
  } catch (err) {
    console.error("Get feed error:", err);
    res.status(500).json({ status: "fail", message: "Server error" });
  }
};
