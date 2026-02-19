const pool = require("../db/db");
const jwt = require("jsonwebtoken");

module.exports = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUserId = decoded.id;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID required" });
    }

    if (String(userId) === String(currentUserId)) {
      return res.status(400).json({ message: "Cannot unfriend yourself" });
    }

    await pool.query(
      `
      delete from friends
      where
        (friend1_id = $1 AND friend2_id = $2)
        or
        (friend1_id = $2 AND friend2_id = $1)
      `,
      [currentUserId, userId]
    );

    return res.json({ success: true });

  } catch (err) {
    console.error("unfriendUser error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};