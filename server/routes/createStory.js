const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pool = require("../db/db");
const auth = require("../middlewares/auth");
const { checkImage } = require("../utils/moderation");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
  upload.single("media"),
  async (req, res) => {
    const file = req.file;
    try {
      const userId = req.user.id;

      if (!file) {
        return res.status(400).json({ status: "fail", message: "No media file provided" });
      }

      // 1. Moderate Image
      let isFlagged = false;
      if (file.mimetype.startsWith("image/")) {
        isFlagged = await checkImage(file.path);
      }

      // 2. Upload to Cloudinary
      const uploadResult = await cloudinary.uploader.upload(file.path, {
        folder: "fakebook_stories",
        resource_type: "auto"
      });

      const mediaType = file.mimetype.startsWith("video/") ? "video" : "image";
      const mediaUrl = uploadResult.secure_url;

      const result = await pool.query(
        `INSERT INTO stories (user_id, media_type, media_url, flagged, created_at, expires_at)
         VALUES ($1, $2, $3, $4, timezone('utc', now()), timezone('utc', now()) + interval '24 hours')
         RETURNING *`,
        [userId, mediaType, mediaUrl, isFlagged]
      );

      // Cleanup
      fs.unlinkSync(file.path);

      res.status(201).json({
        status: "success",
        data: result.rows[0],
      });
    } catch (err) {
      if (file) fs.unlinkSync(file.path);
      console.error("Create story error:", err);
      res.status(500).json({ status: "fail", message: "Failed to create story: " + (err.message || err.toString()) });
    }
  },
];
