const pool = require("../db/db");
const auth = require("../middlewares/auth");

module.exports = [
  auth,
  async (req, res) => {
    const currentUserId = req.user.id;

    try {
      const result = await pool.query(
        `SELECT
           s.story_id,
           s.user_id,
           s.media_type,
           s.media_url,
           s.created_at,
           s.expires_at,
           u.username,
           u.full_name,
           u.profile_picture,
           CASE WHEN sv.viewer_id IS NOT NULL THEN true ELSE false END AS viewed_by_me,
           COUNT(DISTINCT sv2.viewer_id)::int AS view_count
         FROM stories s
         JOIN users u ON s.user_id = u.user_id
         LEFT JOIN story_views sv
           ON sv.story_id = s.story_id AND sv.viewer_id = $1
         LEFT JOIN story_views sv2
           ON sv2.story_id = s.story_id
         WHERE s.expires_at > NOW()
           AND (
             s.user_id = $1
             OR s.user_id IN (
               SELECT friend1_id FROM friends WHERE friend2_id = $1
               UNION
               SELECT friend2_id FROM friends WHERE friend1_id = $1
             )
           )
         GROUP BY s.story_id, u.user_id, sv.viewer_id
         ORDER BY s.created_at DESC`,
        [currentUserId]
      );

      res.json({
        status: "success",
        data: result.rows,
      });
    } catch (err) {
      console.error("Get stories error:", err);
      res.status(500).json({ status: "fail", message: "Failed to fetch stories" });
    }
  },
];
