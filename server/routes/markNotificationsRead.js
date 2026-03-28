const pool = require("../db/db");

module.exports = async (req, res) => {
  const currentUserId = Number(req.user.id);

  try {
    await pool.query(
      "UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false",
      [currentUserId]
    );
    res.json({ status: "success" });
  } catch (err) {
    console.error("Mark notifications read error:", err);
    res.status(500).json({ status: "fail" });
  }
};
