const pool = require("../db/db");
const auth = require("../middlewares/auth");

module.exports = [
  auth,
  async (req, res) => {
    const userId = req.user.id;

    if (!userId) {
      return res.status(401).json({ status: "fail", message: "Unauthorized" });
    }

    try {
      await pool.query("CALL delete_user_account($1)", [userId]);
      res.json({ status: "success", message: "Account deleted successfully" });
    } catch (err) {
      console.error("Delete user error:", err);
      res.status(500).json({ status: "fail", message: "Failed to delete account" });
    }
  },
];
