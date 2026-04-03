const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pool = require("../db/db");
const auth = require("../middlewares/auth");
const { checkText, checkImage } = require("../utils/moderation");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Switch to Disk Storage to allow local moderation before Cloudinary upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "temp/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage });

module.exports = [
    auth,
    upload.array("media", 10), 
    async (req, res) => {
        const files = req.files || [];
        try {
                const { caption, visibility = 1, tagged_user_ids = [] } = req.body;
                const userId = req.user.id;

                let isFlagged = false;

                // 1. Moderate Text
                if (caption) {
                    const textFlagged = await checkText(caption);
                    if (textFlagged) isFlagged = true;
                }

                // 2. Moderate Images
                const mediaModerationResults = [];
                for (const file of files) {
                    let fileFlagged = false;
                    if (file.mimetype.startsWith("image/")) {
                        fileFlagged = await checkImage(file.path);
                        if (fileFlagged) isFlagged = true;
                    }
                    mediaModerationResults.push({ path: file.path, isFlagged: fileFlagged, mimetype: file.mimetype });
                }

                // Parse tags
                let taggedIds = [];
                if (Array.isArray(tagged_user_ids)) {
                    taggedIds = tagged_user_ids;
                } else if (typeof tagged_user_ids === "string") {
                    try { taggedIds = JSON.parse(tagged_user_ids); } catch (e) { taggedIds = []; }
                }

                const postType = files.length > 0 ? "p" : "c";

                if (!caption && files.length === 0) {
                    return res.status(400).json({ status: "fail", message: "Post cannot be empty" });
                }

                const client = await pool.connect();

                try {
                    await client.query("BEGIN");

                    // Insert post with all columns verified from schema
                    const postResult = await client.query(
                        `INSERT INTO posts (user_id, caption, visibility, post_type, flagged, created_at, updated_at)
                         VALUES ($1, $2, $3, $4, $5, timezone('utc', now()), timezone('utc', now()))
                         RETURNING *`,
                        [userId, caption || "", visibility, postType, isFlagged]
                    );

                    const newPost = postResult.rows[0];

                    if (taggedIds.length > 0) {
                        for (const tid of taggedIds) {
                            await client.query(
                                `INSERT INTO post_tags (post_id, tagged_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                                [newPost.post_id, tid]
                            );
                        }
                    }

                    const mediaRecords = [];
                    for (let i = 0; i < mediaModerationResults.length; i++) {
                        const mResult = mediaModerationResults[i];
                        // Upload to Cloudinary
                        const uploadResult = await cloudinary.uploader.upload(mResult.path, {
                            folder: "fakebook_posts",
                            resource_type: "auto"
                        });

                        const mediaType = mResult.mimetype.startsWith("video/") ? "video" : "image";

                        const mediaResult = await client.query(
                            `INSERT INTO content_media (media_url, media_type, type, reference_id, flagged, media_order)
                             VALUES ($1, $2, 'post', $3, $4, $5)
                             RETURNING *`,
                            [uploadResult.secure_url, mediaType, newPost.post_id, mResult.isFlagged, i]
                        );
                        mediaRecords.push(mediaResult.rows[0]);

                        // Cleanup temp file
                        fs.unlinkSync(mResult.path);
                    }

                    await client.query("COMMIT");

                    res.status(201).json({
                        status: "success",
                        data: {
                            post: newPost,
                            media: mediaRecords,
                            tags: taggedIds
                        },
                    });
            } catch (err) {
                await client.query("ROLLBACK");
                console.error("Transaction error during post creation:", err);
                return res.status(500).json({ 
                    status: "fail", 
                    message: "Database transaction failed", 
                    error: err.message,
                    detail: err.detail
                });
            } finally {
                client.release();
            }
        } catch (err) {
            console.error("Create post error:", err);
            res.status(500).json({ status: "fail", message: "Failed to create post: " + err.message });
        }
    },
];
