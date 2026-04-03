const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pool = require("../db/db");
const auth = require("../middlewares/auth");
const { checkText, checkImage } = require("../utils/moderation");

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
        const { id } = req.params;
        const files = req.files || [];
        try {
            const { caption, deletedMediaIds = "[]" } = req.body;
            const userId = req.user.id;

            let parsedDeletedIds = [];
            try { parsedDeletedIds = JSON.parse(deletedMediaIds); } catch(e) {}

            let isFlagged = false;

            if (caption) {
                const textFlagged = await checkText(caption);
                if (textFlagged) isFlagged = true;
            }

            const mediaModerationResults = [];
            for (const file of files) {
                let fileFlagged = false;
                if (file.mimetype.startsWith("image/")) {
                    fileFlagged = await checkImage(file.path);
                    if (fileFlagged) isFlagged = true;
                }
                mediaModerationResults.push({ path: file.path, isFlagged: fileFlagged, mimetype: file.mimetype });
            }

            const client = await pool.connect();
            try {
                await client.query("BEGIN");

                const postRes = await client.query("SELECT * FROM posts WHERE post_id = $1", [id]);
                if (postRes.rows.length === 0) {
                    await client.query("ROLLBACK");
                    return res.status(404).json({ status: "fail", message: "Post not found" });
                }
                if (postRes.rows[0].user_id != userId) {
                    await client.query("ROLLBACK");
                    return res.status(403).json({ status: "fail", message: "Unauthorized to edit this post" });
                }

                // Delete specified media entries
                if (parsedDeletedIds.length > 0) {
                    // Make sure deleted media actually belong to this post
                    const mediaRes = await client.query(`SELECT media_id FROM content_media WHERE reference_id = $1 AND type = 'post'`, [id]);
                    const validMediaIds = mediaRes.rows.map(row => row.media_id);
                    const idsToDelete = parsedDeletedIds.filter(mid => validMediaIds.includes(mid));
                    
                    if (idsToDelete.length > 0) {
                        await client.query(`DELETE FROM content_media WHERE media_id = ANY($1::int[])`, [idsToDelete]);
                    }
                }

                const updateResult = await client.query(
                    `UPDATE posts 
                     SET caption = $1, flagged = $2, updated_at = timezone('utc', now())
                     WHERE post_id = $3
                     RETURNING *`,
                    [caption || "", isFlagged, id]
                );

                const updatedPost = updateResult.rows[0];

                // Append any new media
                const mediaRecords = [];
                for (let i = 0; i < mediaModerationResults.length; i++) {
                    const mResult = mediaModerationResults[i];
                    const uploadResult = await cloudinary.uploader.upload(mResult.path, {
                        folder: "fakebook_posts",
                        resource_type: "auto"
                    });

                    const mediaType = mResult.mimetype.startsWith("video/") ? "video" : "image";

                    const mediaResult = await client.query(
                        `INSERT INTO content_media (media_url, media_type, type, reference_id, flagged)
                         VALUES ($1, $2, 'post', $3, $4)
                         RETURNING *`,
                        [uploadResult.secure_url, mediaType, updatedPost.post_id, mResult.isFlagged]
                    );
                    mediaRecords.push(mediaResult.rows[0]);

                    fs.unlinkSync(mResult.path);
                }

                // If post has no active media and caption is empty, maybe error out?
                const remainingMediaRes = await client.query(`SELECT count(*) FROM content_media WHERE reference_id = $1 AND type = 'post'`, [updatedPost.post_id]);
                if (remainingMediaRes.rows[0].count == 0 && !caption) {
                    await client.query("ROLLBACK");
                    return res.status(400).json({ status: "fail", message: "Post cannot be totally empty" });
                }

                await client.query("COMMIT");

                res.status(200).json({
                    status: "success",
                    data: {
                        post: updatedPost,
                        newMedia: mediaRecords
                    },
                });
            } catch(err) {
                await client.query("ROLLBACK");
                throw err;
            } finally {
                client.release();
            }
        } catch(err) {
            console.error("Update post error:", err);
            res.status(500).json({ status: "fail", message: "Failed to update post: " + err.message });
        }
    }
];
