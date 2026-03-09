const pool = require("../db/db");
const auth = require("../middlewares/auth");

module.exports = [
    auth,
    async (req, res) => {
        try {
            const { id } = req.params;

            // Ensure the user exists
            const userCheck = await pool.query(
                "SELECT user_id FROM users WHERE user_id = $1",
                [id]
            );

            if (userCheck.rows.length === 0) {
                return res
                    .status(404)
                    .json({ status: "fail", message: "User not found" });
            }

            // Fetch posts for the user
            const postsQuery = await pool.query(
                `SELECT p.post_id, p.user_id, p.caption, p.visibility, p.post_type, p.created_at, p.updated_at,
                u.username, u.full_name, u.profile_picture
         FROM posts p
         JOIN users u ON p.user_id = u.user_id
         WHERE p.user_id = $1
         ORDER BY p.created_at DESC`,
                [id]
            );

            const posts = postsQuery.rows;

            if (posts.length === 0) {
                return res.json({ status: "success", data: [] });
            }

            // Collect all post IDs to fetch media in one query
            const postIds = posts.map((post) => post.post_id);

            // Fetch all media for these posts
            const mediaQuery = await pool.query(
                `SELECT media_id, reference_id, media_url, media_type, media_order
         FROM content_media
         WHERE type = 'post' AND reference_id = ANY($1)
         ORDER BY reference_id, media_order ASC`,
                [postIds]
            );

            const allMedia = mediaQuery.rows;

            // Attach media to their respective posts
            const postsWithMedia = posts.map((post) => {
                post.media = allMedia.filter(
                    (media) => media.reference_id === post.post_id
                );
                return post;
            });

            res.json({ status: "success", data: postsWithMedia });
        } catch (err) {
            console.error("Get user posts error:", err);
            res.status(500).json({ status: "fail", message: "Server error" });
        }
    },
];
