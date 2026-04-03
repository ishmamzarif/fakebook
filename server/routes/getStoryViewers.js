const pool = require("../db/db");
const auth = require("../middlewares/auth");

module.exports = [
  auth,
  async (req, res) => {
    const storyId = req.params.storyId;

    if (!storyId || isNaN(parseInt(storyId, 10))) {
      return res.status(400).json({ status: "fail", message: "Invalid story ID" });
    }

    try {
      // First, check if the story exists and if the requester is the owner
      const storyResult = await pool.query(
        "SELECT user_id FROM stories WHERE story_id = $1",
        [storyId]
      );

      if (storyResult.rows.length === 0) {
        return res.status(404).json({ status: "fail", message: "Story not found" });
      }

      if (Number(storyResult.rows[0].user_id) !== Number(req.user.id)) {
        return res.status(403).json({ status: "fail", message: "Unauthorized to see views for this story" });
      }

      // Get viewers with their details
      const viewersResult = await pool.query(
        `SELECT u.user_id, u.username, u.full_name, u.profile_picture, sv.viewed_at
         FROM story_views sv
         JOIN users u ON sv.viewer_id = u.user_id
         WHERE sv.story_id = $1
         ORDER BY sv.viewed_at DESC`,
        [storyId]
      );

      res.json({
        status: "success",
        data: viewersResult.rows
      });
    } catch (err) {
      console.error("Get story viewers error:", err);
      res.status(500).json({ status: "fail", message: "Failed to fetch viewers" });
    }
  },
];
