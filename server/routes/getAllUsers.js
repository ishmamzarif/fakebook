const pool = require("../db/db");

module.exports = async (req, res) => {
  const result = await pool.query(
    `SELECT user_id, username, email, full_name, bio, profile_picture
     FROM users`
  );

  res.json({
    status: "success",
    results: result.rows.length,
    data: result.rows,
  });
};
