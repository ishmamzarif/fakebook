const pool = require("../db/db");

module.exports = async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
    `SELECT user_id, username, email, full_name, profile_picture,
            cover_picture, bio, phone_number, curr_institution,
            address, is_private, created_at
     FROM users
     WHERE user_id = $1`,
    [id]
  );

  if (!result.rows.length) {
    return res.status(404).json({ status: "fail" });
  }

  res.json({ status: "success", data: result.rows[0] });
};
