const pool = require("../db/db");

module.exports = async (req, res) => {
    const userId = Number(req.user.id);

    try {
        await pool.query(
            "UPDATE notifications SET is_seen = TRUE WHERE user_id = $1 AND is_seen = FALSE",
            [userId]
        );

        res.json({ status: "success", message: "Notifications marked as seen" });
    } catch (err) {
        console.error("Mark seen error:", err);
        res.status(500).json({ status: "fail", message: "Server error" });
    }
};
