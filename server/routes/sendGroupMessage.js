const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const pool = require("../db/db");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "fakebook_messages",
    allowed_formats: ["jpg", "png", "jpeg", "mp4", "mov"],
    resource_type: "auto",
  },
});

const upload = multer({ storage });

module.exports = [
  upload.array("media", 5),
  async (req, res) => {
    const currentUserId = Number(req.user.id);
    const conversationId = Number(req.params.conversationId);
    const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
    const files = req.files || [];

    if (!Number.isFinite(currentUserId) || !Number.isFinite(conversationId)) {
      return res.status(400).json({ status: "fail", message: "Invalid request" });
    }

    if (!content && files.length === 0) {
      return res.status(400).json({ status: "fail", message: "Message is empty" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const membership = await client.query(
        `SELECT 1
         FROM conversation_members
         WHERE conversation_id = $1 AND user_id = $2
         LIMIT 1`,
        [conversationId, currentUserId]
      );

      if (!membership.rows.length) {
        await client.query("ROLLBACK");
        return res.status(403).json({ status: "fail", message: "Not a member of this group" });
      }

      const insertedMessage = await client.query(
        `INSERT INTO messages (conversation_id, sender_id, content)
         VALUES ($1, $2, $3)
         RETURNING message_id, conversation_id, sender_id, content, created_at`,
        [conversationId, currentUserId, content]
      );

      const message = insertedMessage.rows[0];
      let insertedMedia = [];

      for (const file of files) {
        const mediaType = file.mimetype.startsWith("video/") ? "video" : "image";
        const mediaResult = await client.query(
          `INSERT INTO content_media (media_url, media_type, type, reference_id)
           VALUES ($1, $2, 'message', $3)
           RETURNING media_id, media_url, media_type`,
          [file.path, mediaType, message.message_id]
        );
        insertedMedia.push(mediaResult.rows[0]);
      }

      await client.query("COMMIT");

      return res.status(201).json({
        status: "success",
        data: {
          ...message,
          media: insertedMedia,
        },
      });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Send group message error:", err);
      return res.status(500).json({ status: "fail", message: "Server error" });
    } finally {
      client.release();
    }
  }
];
