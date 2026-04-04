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

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const storyResult = await client.query(
        `SELECT story_id, user_id, expires_at FROM stories WHERE story_id = $1`,
        [storyId]
      );

      if (storyResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ status: "fail", message: "Story not found" });
      }

      const story = storyResult.rows[0];

      if (new Date(story.expires_at) < new Date()) {
        await client.query("ROLLBACK");
        return res.status(410).json({ status: "fail", message: "Story has expired" });
      }

      if (Number(story.user_id) === Number(viewerId)) {
        await client.query("COMMIT");
        return res.json({ status: "success", message: "Own story, view not recorded" });
      }

      await client.query(
        `INSERT INTO story_views (story_id, viewer_id)
         VALUES ($1, $2)
         ON CONFLICT (story_id, viewer_id) DO NOTHING`,
        [storyId, viewerId]
      );

      await client.query("COMMIT");
      res.json({ status: "success", message: "View recorded" });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("View story error:", err);
      res.status(500).json({ status: "fail", message: "Failed to record view" });
    } finally {
      client.release();
    }
  },
];
