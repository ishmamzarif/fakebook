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
    folder: "fakebook_uploads",
    allowed_formats: ["jpg", "png", "jpeg"],
  },
});

const upload = multer({ storage });

module.exports = [
  upload.fields([
    { name: "profile_picture", maxCount: 1 },
    { name: "cover_picture", maxCount: 1 },
  ]),
  async (req, res) => {
    const { id } = req.params;

    let fields = [];
    let values = [];
    let i = 1;

    for (const key of ["full_name","phone_number","address","bio","curr_institution","is_private"]) {
      if (req.body[key] !== undefined) {
        fields.push(`${key}=$${i++}`);
        values.push(req.body[key]);
      }
    }

    if (req.files?.profile_picture) {
      fields.push(`profile_picture=$${i++}`);
      values.push(req.files.profile_picture[0].path);
    }

    if (req.files?.cover_picture) {
      fields.push(`cover_picture=$${i++}`);
      values.push(req.files.cover_picture[0].path);
    }

    if (!fields.length) {
      return res.status(400).json({ status: "fail" });
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE users SET ${fields.join(", ")}
       WHERE user_id=$${i} RETURNING *`,
      values
    );

    res.json({ status: "success", data: result.rows[0] });
  },
];
