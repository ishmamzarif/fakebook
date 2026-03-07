const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const { body, validationResult } = require("express-validator");
const { isValidPhoneNumber } = require("libphonenumber-js");
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
    folder: "fakebook_uploads",
    allowed_formats: ["jpg", "png", "jpeg"],
  },
});

const upload = multer({ storage });

// Validation middleware for phone number
const validatePhoneNumber = body("phone_number")
  .optional({ checkFalsy: true })
  .custom((value) => {
    // Try to validate for common countries
    const countryCodes = ["BD", "US", "GB", "IN", "PK", "AU", "CA", "FR", "DE", "JP", "CN"];
    const isValidForAnyCountry = countryCodes.some(code =>
      isValidPhoneNumber(value, code)
    );

    if (!isValidForAnyCountry && !isValidPhoneNumber(value)) {
      throw new Error("Invalid phone number format");
    }
    return true;
  });

module.exports = [
  auth,
  upload.fields([
    { name: "profile_picture", maxCount: 1 },
    { name: "cover_picture", maxCount: 1 },
  ]),
  validatePhoneNumber,
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: "fail", errors: errors.array() });
      }

      const { id } = req.params;
      const currentUserId = req.user.id;

      // Authorization check - user can only update their own profile
      if (String(currentUserId) !== String(id)) {
        return res.status(403).json({ status: "fail", message: "Unauthorized" });
      }

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
        return res.status(400).json({ status: "fail", message: "No fields to update" });
      }

      values.push(id);

      const result = await pool.query(
        `UPDATE users SET ${fields.join(", ")}
         WHERE user_id=$${i} RETURNING *`,
        values
      );

      res.json({ status: "success", data: result.rows[0] });
    } catch (err) {
      console.error("Update user error:", err);
      res.status(500).json({ status: "fail", message: "Update failed" });
    }
  },
];
