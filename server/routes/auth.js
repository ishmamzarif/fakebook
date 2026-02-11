const express = require("express");
const jwt = require("jsonwebtoken");
const pool = require("../db/db");

const router = express.Router();

/* LOGIN */
router.post("/login", async (req, res) => {
  const { username_or_email, password } = req.body;

  const result = await pool.query(
    `SELECT user_id, username, email, full_name, profile_picture
     FROM users
     WHERE (username=$1 OR email=$1) AND password=$2`,
    [username_or_email, password]
  );

  if (!result.rows.length) {
    return res.status(401).json({ status: "fail" });
  }

  const user = result.rows[0];

  const token = jwt.sign(
    { id: user.user_id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ status: "success", data: { ...user, token } });
});

/* REGISTER */
router.post("/register", async (req, res) => {
  const { username, email, password, full_name } = req.body;

  const exists = await pool.query(
    "SELECT 1 FROM users WHERE username=$1 OR email=$2",
    [username, email]
  );

  if (exists.rows.length) {
    return res.status(409).json({ status: "fail" });
  }

  const result = await pool.query(
    `INSERT INTO users (username,email,password,full_name)
     VALUES ($1,$2,$3,$4)
     RETURNING user_id,username,email,full_name`,
    [username, email, password, full_name]
  );

  res.status(201).json({ status: "success", data: result.rows[0] });
});

module.exports = router;
