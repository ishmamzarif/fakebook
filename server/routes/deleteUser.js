const pool = require("../db/db");
const auth = require("../middlewares/auth");

module.exports = [
  auth,
  async (req, res) => {
    const userId = req.user.id;

    if (!userId) {
      return res.status(401).json({ status: "fail", message: "Unauthorized" });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Delete notifications related to the user (as recipient or actor)
      await client.query("DELETE FROM notifications WHERE user_id = $1 OR actor_id = $1", [userId]);

      // 2. Delete messages (as sender or receiver)
      await client.query("DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1", [userId]);

      // 3. Delete friend requests (as sender or receiver)
      await client.query("DELETE FROM friend_requests WHERE sender_id = $1 OR receiver_id = $1", [userId]);

      // 4. Delete friends entries
      await client.query("DELETE FROM friends WHERE user_id1 = $1 OR user_id2 = $1", [userId]);

      // 5. Delete likes/reactions by the user
      await client.query("DELETE FROM likes WHERE user_id = $1", [userId]);

      // 6. Delete media associated with user's posts or comments
      // First, get media IDs for user's posts
      const userPostIdsResult = await client.query("SELECT post_id FROM posts WHERE user_id = $1", [userId]);
      const userPostIds = userPostIdsResult.rows.map(r => r.post_id);

      if (userPostIds.length > 0) {
        // Delete media for these posts
        await client.query("DELETE FROM content_media WHERE type = 'post' AND reference_id = ANY($1)", [userPostIds]);
        
        // Delete likes/reactions on these posts
        await client.query("DELETE FROM likes WHERE target_id = ANY($1)", [userPostIds]);

        // Delete comments on these posts
        // We'll delete comments later in step 7, but we need to handle media for those comments too.
      }

      // 7. Delete comments by the user AND comments on the user's posts
      // First, handle media for comments that will be deleted
      const userCommentsResult = await client.query(
        "SELECT comment_id FROM comments WHERE user_id = $1 OR post_id = ANY($2)", 
        [userId, userPostIds.length > 0 ? userPostIds : [-1]]
      );
      const commentIdsToDelete = userCommentsResult.rows.map(r => r.comment_id);

      if (commentIdsToDelete.length > 0) {
        await client.query("DELETE FROM content_media WHERE type = 'comment' AND reference_id = ANY($1)", [commentIdsToDelete]);
        await client.query("DELETE FROM comments WHERE comment_id = ANY($1)", [commentIdsToDelete]);
      }

      // 8. Delete user's posts
      await client.query("DELETE FROM posts WHERE user_id = $1", [userId]);

      // 9. Finally, delete the user
      await client.query("DELETE FROM users WHERE user_id = $1", [userId]);

      await client.query("COMMIT");

      res.json({ status: "success", message: "Account deleted successfully" });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Delete user error:", err);
      res.status(500).json({ status: "fail", message: "Failed to delete account" });
    } finally {
      client.release();
    }
  },
];
