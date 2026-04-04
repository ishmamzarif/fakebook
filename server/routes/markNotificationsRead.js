const pool = require("../db/db");

module.exports = async (req, res) => {
  const currentUserId = Number(req.user.id);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      "UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false",
      [currentUserId]
    );

    await client.query("COMMIT");
    res.json({ status: "success" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Mark notifications read error:", err);
    res.status(500).json({ status: "fail" });
  } finally {
    client.release();
  }
};
