const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const pool = require("../db/db");
const auth = require("../middlewares/auth");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "fakebook_posts",
        allowed_formats: ["jpg", "png", "jpeg", "mp4", "mov"],
        resource_type: "auto",
    },
});

const upload = multer({ storage });

module.exports = [
    auth,
    upload.array("media", 10), // Allow up to 10 media files
    async (req, res) => {
        try {
            const { caption, visibility = 1 } = req.body;
            const userId = req.user.id;
            const files = req.files || [];

            // Determine post type
            // 'c' for caption-only, 'p' for media post
            const postType = files.length > 0 ? "p" : "c";

            if (!caption && files.length === 0) {
                return res
                    .status(400)
                    .json({ status: "fail", message: "Post cannot be empty" });
            }

            // Start transaction
            const client = await pool.connect();

            try {
                await client.query("BEGIN");

                // Insert post
                const postResult = await client.query(
                    `INSERT INTO posts (user_id, caption, visibility, post_type, created_at, updated_at)
           VALUES ($1, $2, $3, $4, timezone('utc', now()), timezone('utc', now()))
           RETURNING *`,
                    [userId, caption || "", visibility, postType]
                );

                const newPost = postResult.rows[0];

                // Insert media if present
                const mediaRecords = [];
                if (files.length > 0) {
                    let order = 1;
                    for (const file of files) {
                        // Cloudinary identifies video/image in resource_type after upload
                        const mediaType = file.mimetype.startsWith("video/")
                            ? "video"
                            : "image";

                        const mediaResult = await client.query(
                            `INSERT INTO content_media (media_url, media_type, type, reference_id, media_order)
               VALUES ($1, $2, 'post', $3, $4)
               RETURNING *`,
                            [file.path, mediaType, newPost.post_id, order]
                        );
                        mediaRecords.push(mediaResult.rows[0]);
                        order++;
                    }
                }

                await client.query("COMMIT");

                res.status(201).json({
                    status: "success",
                    data: {
                        post: newPost,
                        media: mediaRecords,
                    },
                });
            } catch (err) {
                await client.query("ROLLBACK");
                console.error("Transaction error during post creation:", err);
                throw err;
            } finally {
                client.release();
            }
        } catch (err) {
            console.error("Create post error:", err);
            res.status(500).json({ status: "fail", message: "Failed to create post" });
        }
    },
];
