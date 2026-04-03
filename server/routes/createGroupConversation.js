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

const handleCreate = async (req, res) => {
  const currentUserId = Number(req.user.id);
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const memberIdsStr = req.body.member_ids;
  const file = req.file;

  let memberIds = [];
  if (Array.isArray(memberIdsStr)) {
    memberIds = memberIdsStr;
  } else if (typeof memberIdsStr === "string") {
    try { memberIds = JSON.parse(memberIdsStr); } catch (e) { memberIds = []; }
  }

  if (!Number.isFinite(currentUserId)) {
    if (file) fs.unlinkSync(file.path);
    return res.status(400).json({ status: "fail", message: "Invalid user id" });
  }

  const uniqueMemberIds = Array.from(
    new Set(
      memberIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id !== currentUserId)
    )
  );

  if (!name) {
    if (file) fs.unlinkSync(file.path);
    return res.status(400).json({ status: "fail", message: "Group name is required" });
  }

  if (uniqueMemberIds.length === 0) {
    if (file) fs.unlinkSync(file.path);
    return res.status(400).json({ status: "fail", message: "Select at least one friend" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let groupPhotoUrl = null;
    if (file) {
        const uploadResult = await cloudinary.uploader.upload(file.path, {
            folder: "group_photos",
        });
        groupPhotoUrl = uploadResult.secure_url;
        fs.unlinkSync(file.path);
    }

    const conversationResult = await client.query(
      `INSERT INTO conversations (is_group, group_name, group_photo_url, created_by)
       VALUES (true, $1, $2, $3)
       RETURNING conversation_id, is_group, group_name, group_photo_url, created_at, created_by`,
      [name, groupPhotoUrl, currentUserId]
    );

    const conversation = conversationResult.rows[0];

    const allMembers = [currentUserId, ...uniqueMemberIds];
    for (const userId of allMembers) {
      await client.query(
        `INSERT INTO conversation_members (conversation_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [conversation.conversation_id, userId]
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({
      status: "success",
      data: conversation,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    console.error("Create group conversation error:", err);
    return res.status(500).json({ status: "fail", message: "Server error" });
  } finally {
    client.release();
  }
};

module.exports = [auth, upload.single("image"), handleCreate];

