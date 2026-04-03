const pool = require("../db/db");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const auth = require("../middlewares/auth");

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

const handleUpdate = async (req, res) => {
  const { conversationId } = req.params;
  const { groupName } = req.body;
  const currentUserId = req.user.id;
  const file = req.file;

  try {
    // Check if user is admin (owner)
    const conversation = await pool.query(
      "SELECT created_by FROM conversations WHERE conversation_id = $1",
      [conversationId]
    );

    if (conversation.rows.length === 0) {
      if (file) fs.unlinkSync(file.path);
      return res.status(404).json({ status: "fail", message: "Conversation not found" });
    }

    if (conversation.rows[0].created_by !== currentUserId) {
      if (file) fs.unlinkSync(file.path);
      return res.status(403).json({ status: "fail", message: "Only admin can update group info" });
    }

    const updates = [];
    const params = [];
    let idx = 1;

    if (groupName !== undefined && groupName.trim() !== "") {
      updates.push(`group_name = $${idx++}`);
      params.push(groupName);
    }

    if (file) {
      const uploadResult = await cloudinary.uploader.upload(file.path, {
        folder: "group_photos",
      });
      updates.push(`group_photo_url = $${idx++}`);
      params.push(uploadResult.secure_url);
      fs.unlinkSync(file.path);
    }

    if (updates.length === 0) {
      return res.status(400).json({ status: "fail", message: "No update values provided" });
    }

    params.push(conversationId);
    const updated = await pool.query(
      `UPDATE conversations SET ${updates.join(', ')} WHERE conversation_id = $${idx} RETURNING *`,
      params
    );

    res.json({
      status: "success",
      message: "Group updated successfully",
      data: updated.rows[0],
    });
  } catch (err) {
    console.error("Update group error:", err);
    if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    res.status(500).json({ status: "fail", message: "Server error" });
  }
};

module.exports = [auth, upload.single("image"), handleUpdate];
