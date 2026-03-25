const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const auth = require("../middlewares/auth");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "fakebook_comments",
    allowed_formats: ["jpg", "png", "jpeg", "mp4", "mov"],
    resource_type: "auto",
  },
});

const upload = multer({ storage });

module.exports = [
  auth,
  upload.array("media", 10),
  async (req, res) => {
    try {
      const files = req.files || [];

      const uploaded = files.map((file) => ({
        media_url: file.path,
        media_type: file.mimetype && file.mimetype.startsWith("video/") ? "video" : "image",
      }));

      return res.status(201).json({ status: "success", data: uploaded });
    } catch (err) {
      console.error("Upload comment media error:", err);
      return res.status(500).json({ status: "fail", message: "Server error" });
    }
  },
];

