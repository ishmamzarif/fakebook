const pool = require("../db/db");
const auth = require("../middlewares/auth");

module.exports = [
  auth,
  async (req, res) => {
    const viewerId = req.user.id;
    const storyId = req.params.storyId;

    if (!storyId || isNaN(parseInt(storyId, 10))) {
      return res.status(400).json({ status: "fail", message: "Invalid story ID" });
    }

    try {
      const storyResult = await pool.query(
        `SELECT story_id, user_id, expires_at FROM stories WHERE story_id = $1`,
        [storyId]
      );

      if (storyResult.rows.length === 0) {
        return res.status(404).json({ status: "fail", message: "Story not found" });
      }

      const story = storyResult.rows[0];

      if (new Date(story.expires_at) < new Date()) {
        return res.status(410).json({ status: "fail", message: "Story has expired" });
      }

      if (Number(story.user_id) === Number(viewerId)) {
        return res.json({ status: "success", message: "Own story, view not recorded" });
      }

      await pool.query(
        `INSERT INTO story_views (story_id, viewer_id)
         VALUES ($1, $2)
         ON CONFLICT (story_id, viewer_id) DO NOTHING`,
        [storyId, viewerId]
      );

      res.json({ status: "success", message: "View recorded" });
    } catch (err) {
      console.error("View story error:", err);
      res.status(500).json({ status: "fail", message: "Failed to record view" });
    }
  },
];
