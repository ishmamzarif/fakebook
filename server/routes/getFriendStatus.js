const pool = require("../db/db");

module.exports = async (req, res) => {
  const currentUserId = Number(req.user.id);
  const { profileUserId } = req.params;

  if (!Number.isFinite(currentUserId)) {
    return res.status(400).json({ status: "fail", message: "Invalid user id" });
  }

  try {
    const result = await pool.query(
      "SELECT get_friend_status($1, $2) as status",
      [currentUserId, profileUserId]
    );

    const status = result.rows[0].status;
    res.json({ status: "success", data: status });

  } catch (err) {
    console.error("Get friend status error:", err);
    res.status(500).json({ status: "fail", message: "Server error" });
  }
};
