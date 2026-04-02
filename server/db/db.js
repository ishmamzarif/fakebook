const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Force UTC for all database sessions to ensure timestamp consistency
pool.on("connect", (client) => {
  client.query("SET TIME ZONE 'UTC'");
});

module.exports = pool;

