const pool = require("../db/db");

module.exports = async (req, res) => {
  const result = await pool.query(`
    SELECT p.post_id, p.content, p.image, p.created_at,
           u.user_id, u.username, u.profile_picture,
           COUNT(DISTINCT l.user_id) like_count,
           COUNT(DISTINCT c.comment_id) comment_count
    FROM posts p
    JOIN users u ON p.user_id=u.user_id
    LEFT JOIN likes l ON p.post_id=l.post_id
    LEFT JOIN comments c ON p.post_id=c.post_id
    GROUP BY p.post_id, u.user_id
    ORDER BY p.created_at DESC
  `);

  res.json({
    status: "success",
    data: result.rows,
  });
};
