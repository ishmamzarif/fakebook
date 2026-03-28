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
    folder: "fakebook_stories",
    allowed_formats: ["jpg", "jpeg", "png", "mp4", "mov", "webm"],
    resource_type: "auto",
  },
});

const upload = multer({ storage });

module.exports = [
  auth,
  upload.single("media"),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ status: "fail", message: "No media file provided" });
      }

      const mediaType = file.mimetype.startsWith("video/") ? "video" : "image";
      const mediaUrl = file.path;

      const result = await pool.query(
        `INSERT INTO stories (user_id, media_type, media_url, expires_at)
         VALUES ($1, $2, $3, NOW() + interval '24 hours')
         RETURNING *`,
        [userId, mediaType, mediaUrl]
      );

      res.status(201).json({
        status: "success",
        data: result.rows[0],
      });
    } catch (err) {
      console.error("Create story error:", err);
      res.status(500).json({ status: "fail", message: "Failed to create story: " + (err.message || err.toString()) });
    }
  },
];
