const pool = require("../db/db");

module.exports = async (req, res) => {
  const queryText = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const parsedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
    ? Math.min(parsedLimit, 20)
    : 50;

  const params = [];
  let whereClause = "";

  if (queryText) {
    params.push(`%${queryText}%`);
    whereClause = `WHERE username ILIKE $${params.length} OR full_name ILIKE $${params.length} OR nickname ILIKE $${params.length}`;
  }

  params.push(limit);

  const result = await pool.query(
    `SELECT user_id, username, email, full_name, bio, profile_picture
     FROM users
     ${whereClause}
     ORDER BY username ASC
     LIMIT $${params.length}`,
    params
  );

  res.json({
    status: "success",
    results: result.rows.length,
    data: result.rows,
  });
};
