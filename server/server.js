require("dotenv").config();

const express = require("express");
const pool = require("D:\\2-1\\fakebook\\fakebook\\server\\db\\db.js"); // adjust path if needed

const app = express();

// middleware
app.use(express.json());

// test DB connection (KEEP THIS FOR NOW)
// pool.query("SELECT NOW()", (err, res) => {
//   if (err) {
//     console.error("DB connection failed:", err.message);
//   } else {
//     console.log("DB connected at:", res.rows[0].now);
//   }
// });

// get all users
app.get("/api/v1/users", async (req, res) => {
  try {
    const results = await pool.query("SELECT * FROM users");

    res.status(200).json({
      status: "success",
      results: results.rows.length,
      data: {
        users: results.rows,
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// get one user
app.get("/api/v1/users/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const results = await pool.query(
      "SELECT * FROM users WHERE id = $1",
      [id]
    );

    res.status(200).json({
      status: "success",
      data: {
        user: results.rows[0],
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// create a user
app.post("/api/v1/users", async (req, res) => {
  const { name, profession, address, bio, profile_image } = req.body;
  console.log(req.body);

  try {
    const results = await pool.query(
      "INSERT INTO users (name, profession, address, bio, profile_image) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [name, profession, address, bio, profile_image]
    );

    res.status(201).json({
      status: "user created",
      data: {
        user: results.rows[0],
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// update a user
app.put("/api/v1/users/:id", async (req, res) => {
  const { id } = req.params;
  const { name, profession, address, bio, profile_image } = req.body;

  try {
    const results = await pool.query(
      "UPDATE users SET name = $1, profession = $2, address = $3, bio = $4, profile_image = $5 WHERE id = $6 RETURNING *",
      [name, profession, address, bio, profile_image, id]
    );

    res.status(200).json({
      status: "success",
      data: {
        user: results.rows[0],
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// delete a user
app.delete("/api/v1/users/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const results = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING *",
      [id]
    );

    if (results.rows.length === 0) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        user: results.rows[0],
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
