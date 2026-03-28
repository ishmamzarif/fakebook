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

// Validation middleware for phone number - improved to be more permissive
const validatePhoneNumber = body("phone_number")
  .optional({ checkFalsy: true })
  .custom((value) => {
    // Basic length/format check if it starts with + or just digits
    if (!value || value.trim() === "" || value === "null" || value === "undefined") return true;
    
    // Check if it's a valid phone number format globally (very permissive)
    try {
      if (!isValidPhoneNumber(value)) {
          // If not valid as international, check if it's at least 7+ digits
          const cleaned = value.replace(/\D/g, '');
          if (cleaned.length < 7) {
              throw new Error("Invalid phone number format");
          }
      }
    } catch (e) {
      // If validation throws, we still allow basic digit patterns
      if (!/^\+?[\d\s-]{7,20}$/.test(value)) {
        throw new Error("Invalid phone number format");
      }
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
        console.log("Validation errors in updateUser:", errors.array());
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

      // List of supported columns
      const updatableFields = ["full_name", "phone_number", "address", "bio", "curr_institution", "is_private", "hide_inappropriate"];

      for (const key of updatableFields) {
        if (req.body[key] !== undefined && req.body[key] !== "undefined" && req.body[key] !== "null") {
          fields.push(`${key}=$${i++}`);
          
          let val = req.body[key];
          
          // Boolean parsing from FormData strings
          if (key === "is_private" || key === "hide_inappropriate") {
            val = val === "true" || val === true;
          }
          
          values.push(val);
        }
      }

      // Add file fields if present
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

      // Final where parameter
      values.push(Number(id));

      const query = `UPDATE users SET ${fields.join(", ")} WHERE user_id=$${i} RETURNING *`;
      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ status: "fail", message: "User not found" });
      }

      res.json({ status: "success", data: result.rows[0] });
    } catch (err) {
      console.error("Update user error:", err);
      res.status(500).json({ status: "fail", message: "Update failed" });
    }
  },
];

