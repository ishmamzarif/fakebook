const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { body, validationResult } = require("express-validator");
const { isValidPhoneNumber } = require("libphonenumber-js");
const pool = require("../db/db");

const router = express.Router();

/* LOGIN */
router.post("/login", async (req, res) => {
  const { username_or_email, password } = req.body;

  try {
    const result = await pool.query(
      `SELECT user_id, username, email, full_name, profile_picture, password, is_private, hide_inappropriate
       FROM users
       WHERE username=$1 OR email=$1`,
      [username_or_email]
    );

    if (!result.rows.length) {
      return res.status(401).json({ status: "fail", message: "Invalid credentials" });
    }

    const user = result.rows[0];

    // Compare hashed password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ status: "fail", message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.user_id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ status: "success", data: { ...user, token } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ status: "fail", message: "Server error" });
  }
});

/* REGISTER */
router.post(
  "/register",
  [
    body("email").isEmail().withMessage("Invalid email format"),
    body("username")
      .isLength({ min: 3, max: 20 })
      .withMessage("Username must be 3-20 characters")
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage("Username can only contain letters, numbers, and underscore"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
    body("full_name")
      .notEmpty()
      .withMessage("Full name is required")
      .isLength({ max: 100 })
      .withMessage("Full name must be under 100 characters"),
    body("phone_number")
      .notEmpty()
      .withMessage("Phone number is required")
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
      })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "fail", errors: errors.array() });
    }

    const { username, email, password, full_name, phone_number } = req.body;

    try {
      const exists = await pool.query(
        "SELECT 1 FROM users WHERE username=$1 OR email=$2",
        [username, email]
      );

      if (exists.rows.length) {
        return res.status(409).json({ status: "fail", message: "Username or email already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await pool.query(
        `INSERT INTO users (username,email,password,full_name,phone_number)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING user_id,username,email,full_name,phone_number,is_private,hide_inappropriate`,
        [username, email, hashedPassword, full_name, phone_number]
      );

      const user = result.rows[0];

      // Create token for the newly registered user
      const token = jwt.sign(
        { id: user.user_id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.status(201).json({ status: "success", data: { ...user, token } });
    } catch (err) {
      console.error("Register error:", err);
      res.status(500).json({ status: "fail", message: "Registration failed" });
    }
  }
);

module.exports = router;
