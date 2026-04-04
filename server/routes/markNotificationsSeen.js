const pool = require("../db/db");

module.exports = async (req, res) => {
    const userId = Number(req.user.id);
    const type = req.body ? req.body.type : null; // Optional type filtering

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      let query = "UPDATE notifications SET is_seen = TRUE WHERE user_id = $1 AND is_seen = FALSE";
      let params = [userId];

      if (type) {
          query += " AND type = $2";
          params.push(type);
      }

      await client.query(query, params);

      await client.query("COMMIT");
      res.json({ status: "success", message: `Notifications ${type ? `of type ${type} ` : ''}marked as seen` });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Mark seen error:", err);
      res.status(500).json({ status: "fail", message: "Server error" });
    } finally {
      client.release();
    }
};
